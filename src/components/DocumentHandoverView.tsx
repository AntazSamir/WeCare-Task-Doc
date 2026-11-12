import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DocumentHandover,
  DocumentRequest,
  HandoverContextData,
  HandoverStats,
  UserProfile,
} from '../types/pms';
import { fetchHandoverContext, fetchHandoverStats } from '../services/pmsService';
import { CounselorHandoverDashboard, CounselorTab } from './CounselorHandoverDashboard';
import { AdmissionHandoverDashboard, AdmissionTab } from './AdmissionHandoverDashboard';
import { CreateHandoverModal } from './CreateHandoverModal';
import { CreateDocumentRequestModal } from './CreateDocumentRequestModal';
import { HandoverAcknowledgementModal } from './HandoverAcknowledgementModal';
import { FollowUpDeliveryModal } from './FollowUpDeliveryModal';
import { HandoverDetailModal } from './HandoverDetailModal';
import { RequestDetailModal } from './RequestDetailModal';

interface DocumentHandoverViewProps {
  currentUser: UserProfile;
  initialHandoverId?: string | null;
  onClearInitialHandoverId?: () => void;
  onNotifyToast: (
    title: string,
    message: string,
    type?: 'info' | 'success' | 'warning' | 'overdue'
  ) => void;
  onStatsChanged?: (stats: HandoverStats) => void;
}

export const DocumentHandoverView: React.FC<DocumentHandoverViewProps> = ({
  currentUser,
  initialHandoverId,
  onClearInitialHandoverId,
  onNotifyToast,
  onStatsChanged,
}) => {
  const isAdmin = currentUser.role === 'Admission_Manager';
  const isCounselor = currentUser.team === 'Counseling Team';

  const [stats, setStats] = useState<HandoverStats | null>(null);
  const [contextData, setContextData] = useState<HandoverContextData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Initial tab deep-link state
  const [counselorInitialTab, setCounselorInitialTab] = useState<CounselorTab>('my');
  const [admissionInitialTab, setAdmissionInitialTab] = useState<AdmissionTab>('pending');

  // Shared Modal State
  const [isCreateHandoverOpen, setIsCreateHandoverOpen] = useState(false);
  const [linkedRequestForHandover, setLinkedRequestForHandover] = useState<DocumentRequest | null>(
    null
  );
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [verifyHandover, setVerifyHandover] = useState<DocumentHandover | null>(null);
  const [followUpHandover, setFollowUpHandover] = useState<DocumentHandover | null>(null);
  const [detailHandoverId, setDetailHandoverId] = useState<string | null>(
    initialHandoverId && !initialHandoverId.startsWith('REQ-') ? initialHandoverId : null
  );
  const [detailRequestId, setDetailRequestId] = useState<string | null>(
    initialHandoverId && initialHandoverId.startsWith('REQ-') ? initialHandoverId : null
  );

  // Handle deep-linking from notifications (either HND-... or REQ-...)
  useEffect(() => {
    if (!initialHandoverId) return;
    if (initialHandoverId.startsWith('REQ-')) {
      setDetailRequestId(initialHandoverId);
      setDetailHandoverId(null);
      if (isCounselor) {
        setCounselorInitialTab('requests');
      } else {
        setAdmissionInitialTab('my-requests');
      }
    } else {
      setDetailHandoverId(initialHandoverId);
      setDetailRequestId(null);
    }
  }, [initialHandoverId, isCounselor]);

  const onNotifyToastRef = useRef(onNotifyToast);
  onNotifyToastRef.current = onNotifyToast;
  const onStatsChangedRef = useRef(onStatsChanged);
  onStatsChangedRef.current = onStatsChanged;

  const loadContextAndStats = useCallback(async () => {
    try {
      const [ctx, st] = await Promise.all([fetchHandoverContext(), fetchHandoverStats()]);
      setContextData(ctx);
      setStats(st);
      if (onStatsChangedRef.current) onStatsChangedRef.current(st);
    } catch (err: any) {
      onNotifyToastRef.current(
        'Handover Load Error',
        err?.message || 'Failed to refresh handover stats',
        'warning'
      );
    }
  }, []);

  useEffect(() => {
    loadContextAndStats();
  }, [loadContextAndStats, currentUser.id, refreshTrigger]);

  const triggerGlobalRefresh = () => {
    setRefreshTrigger((n) => n + 1);
  };

  const canUserVerifyHandover = (h: DocumentHandover): boolean => {
    if (h.status === 'Accepted') return false;
    if (h.counselorId === currentUser.id) return false;
    const isAssignedAdmission =
      h.receivingEmployeeId === currentUser.id && currentUser.team === 'Admission Team';
    return isAssignedAdmission || isAdmin;
  };

  const canUserSubmitFollowUp = (h: DocumentHandover): boolean => {
    if (!isCounselor) return false;
    return h.status === 'Partially Received' || h.status === 'Disputed';
  };

  return (
    <>
      {isCounselor ? (
        <CounselorHandoverDashboard
          currentUser={currentUser}
          stats={stats}
          contextData={contextData}
          refreshTrigger={refreshTrigger}
          initialTab={counselorInitialTab}
          onRefreshAll={triggerGlobalRefresh}
          onOpenCreateHandover={(linkedReq) => {
            setLinkedRequestForHandover(linkedReq || null);
            setIsCreateHandoverOpen(true);
          }}
          onOpenHandoverDetail={(hId) => setDetailHandoverId(hId)}
          onOpenFollowUp={(h) => setFollowUpHandover(h)}
          onOpenRequestDetail={(rId) => setDetailRequestId(rId)}
          onNotifyToast={onNotifyToast}
        />
      ) : (
        <AdmissionHandoverDashboard
          currentUser={currentUser}
          stats={stats}
          contextData={contextData}
          refreshTrigger={refreshTrigger}
          initialTab={admissionInitialTab}
          onRefreshAll={triggerGlobalRefresh}
          onOpenCreateRequest={() => setIsCreateRequestOpen(true)}
          onOpenVerify={(h) => setVerifyHandover(h)}
          onOpenHandoverDetail={(hId) => setDetailHandoverId(hId)}
          onOpenRequestDetail={(rId) => setDetailRequestId(rId)}
          onNotifyToast={onNotifyToast}
        />
      )}

      {/* Counselor: Create Handover (Standalone or Linked to Admission Request) */}
      <CreateHandoverModal
        isOpen={isCreateHandoverOpen}
        currentUser={currentUser}
        contextData={contextData}
        linkedRequest={linkedRequestForHandover}
        onClose={() => {
          setIsCreateHandoverOpen(false);
          setLinkedRequestForHandover(null);
        }}
        onSuccess={(createdId) => {
          const reqId = linkedRequestForHandover?.id;
          setIsCreateHandoverOpen(false);
          setLinkedRequestForHandover(null);
          onNotifyToast(
            'Handover Submitted',
            reqId
              ? `${createdId} linked to ${reqId} & queued for Google Sheets synchronization.`
              : `${createdId} submitted & queued for Google Sheets synchronization.`,
            'success'
          );
          triggerGlobalRefresh();
        }}
      />

      {/* Admission: Request Physical Documents from Counselor */}
      <CreateDocumentRequestModal
        isOpen={isCreateRequestOpen}
        currentUser={currentUser}
        contextData={contextData}
        onClose={() => setIsCreateRequestOpen(false)}
        onSuccess={(requestId) => {
          setIsCreateRequestOpen(false);
          setAdmissionInitialTab('my-requests');
          onNotifyToast(
            'Document Request Sent',
            `Request ${requestId} assigned & counselor notified.`,
            'success'
          );
          triggerGlobalRefresh();
        }}
      />

      {/* Admission: Physical Document Verification Modal */}
      <HandoverAcknowledgementModal
        handover={verifyHandover}
        currentUser={currentUser}
        isOpen={!!verifyHandover}
        onClose={() => setVerifyHandover(null)}
        onSuccess={() => {
          const id = verifyHandover?.id;
          setVerifyHandover(null);
          onNotifyToast(
            'Verification Recorded',
            `Handover ${id} verified and counselor notified.`,
            'success'
          );
          triggerGlobalRefresh();
        }}
      />

      {/* Counselor: Missing / Corrected Follow-Up Delivery Modal */}
      <FollowUpDeliveryModal
        handover={followUpHandover}
        currentUser={currentUser}
        isOpen={!!followUpHandover}
        onClose={() => setFollowUpHandover(null)}
        onSuccess={() => {
          const id = followUpHandover?.id;
          setFollowUpHandover(null);
          onNotifyToast(
            'Follow-Up Submitted',
            `Missing/corrected document batch submitted under ${id}.`,
            'success'
          );
          triggerGlobalRefresh();
        }}
      />

      {/* Shared: Handover Manifest & Audit Trail Detail Modal */}
      <HandoverDetailModal
        handoverId={detailHandoverId}
        isOpen={!!detailHandoverId}
        onClose={() => {
          setDetailHandoverId(null);
          if (onClearInitialHandoverId) onClearInitialHandoverId();
        }}
        canVerify={canUserVerifyHandover}
        canFollowUp={canUserSubmitFollowUp}
        onOpenVerify={(h) => setVerifyHandover(h)}
        onOpenFollowUp={(h) => setFollowUpHandover(h)}
        onOpenRequest={(reqId) => setDetailRequestId(reqId)}
      />

      {/* Shared: Document Request Detail Modal */}
      <RequestDetailModal
        requestId={detailRequestId}
        currentUser={currentUser}
        isOpen={!!detailRequestId}
        onClose={() => {
          setDetailRequestId(null);
          if (onClearInitialHandoverId) onClearInitialHandoverId();
        }}
        onFulfillRequest={(req) => {
          setLinkedRequestForHandover(req);
          setIsCreateHandoverOpen(true);
        }}
        onOpenLinkedHandover={(hId) => setDetailHandoverId(hId)}
        onCancelled={() => {
          onNotifyToast('Request Cancelled', 'Open document request was cancelled.', 'info');
          triggerGlobalRefresh();
        }}
      />
    </>
  );
};
