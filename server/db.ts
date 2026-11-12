import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUP_DIR = path.resolve(DATA_DIR, 'backups');
const DB_PATH = path.resolve(DATA_DIR, 'consultancy_pms.sqlite');
const LEGACY_JSON_PATH = path.resolve(DATA_DIR, 'sheetsync_sqlite_store.json');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export const db: Database.Database = new Database(DB_PATH);

// Enable WAL mode and foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  // 1. Create Relational Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('Admission_Manager', 'Consultant')),
      title TEXT NOT NULL,
      avatar TEXT NOT NULL,
      phone TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS universities (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_ko TEXT NOT NULL,
      city TEXT NOT NULL,
      ranking TEXT NOT NULL,
      website_url TEXT NOT NULL,
      topik_requirement TEXT NOT NULL,
      ielts_requirement TEXT NOT NULL,
      bank_balance_usd INTEGER NOT NULL DEFAULT 20000,
      accredited INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admission_intakes (
      id TEXT PRIMARY KEY,
      university_id TEXT NOT NULL,
      term TEXT NOT NULL,
      academic_year INTEGER NOT NULL,
      application_start TEXT NOT NULL,
      application_deadline TEXT NOT NULL,
      quota INTEGER NOT NULL DEFAULT 25,
      status TEXT NOT NULL DEFAULT 'Open',
      required_documents TEXT NOT NULL DEFAULT '[]',
      interview_dates TEXT,
      result_announcement_date TEXT,
      tuition_payment_deadline TEXT,
      verification_status TEXT NOT NULL DEFAULT 'Verified',
      last_verified_at TEXT,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS university_programs (
      id TEXT PRIMARY KEY,
      university_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      degree_level TEXT NOT NULL,
      duration TEXT NOT NULL,
      tuition_fee_krw INTEGER NOT NULL,
      tuition_fee_usd INTEGER NOT NULL DEFAULT 0,
      application_fee_krw INTEGER NOT NULL DEFAULT 100000,
      requirements TEXT NOT NULL,
      language_of_instruction TEXT NOT NULL DEFAULT 'Korean',
      intake_terms TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS university_refund_policies (
      university_id TEXT PRIMARY KEY,
      app_fee_refundable INTEGER NOT NULL DEFAULT 0,
      app_fee_conditions TEXT NOT NULL,
      tuition_refund_policy TEXT NOT NULL,
      visa_rejection_refund TEXT NOT NULL,
      deadlines_description TEXT NOT NULL,
      refund_processing_time TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'Verified',
      last_verified_at TEXT NOT NULL,
      verified_by TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS university_bank_accounts (
      id TEXT PRIMARY KEY,
      university_id TEXT NOT NULL,
      account_holder TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      branch_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      swift_code TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'KRW',
      payment_instructions TEXT NOT NULL,
      is_virtual_account_supported INTEGER NOT NULL DEFAULT 1,
      verification_status TEXT NOT NULL DEFAULT 'Verified',
      last_verified_at TEXT NOT NULL,
      verified_by TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS university_documents (
      id TEXT PRIMARY KEY,
      university_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size TEXT NOT NULL,
      file_format TEXT NOT NULL DEFAULT 'PDF',
      intake_term TEXT,
      verification_status TEXT NOT NULL DEFAULT 'Verified',
      uploaded_at TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS intake_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      university_id TEXT NOT NULL,
      intake_id TEXT,
      intake_term TEXT NOT NULL,
      academic_year INTEGER NOT NULL,
      manager_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Planning', 'Active', 'Under Review', 'Completed', 'Archived')),
      start_date TEXT NOT NULL,
      deadline TEXT NOT NULL,
      target_quota INTEGER NOT NULL DEFAULT 20,
      progress_percentage INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE RESTRICT,
      FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS project_consultants (
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES intake_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_applications (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      passport_number TEXT NOT NULL,
      date_of_birth TEXT,
      nationality TEXT DEFAULT 'International',
      contact_email TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      applied_university_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      department TEXT NOT NULL,
      major TEXT NOT NULL,
      degree_level TEXT NOT NULL,
      intake_term TEXT NOT NULL,
      visa_stage TEXT NOT NULL DEFAULT 'Document_Gathering',
      visa_type TEXT NOT NULL DEFAULT 'D-2',
      assigned_consultant_id TEXT NOT NULL,
      submission_date TEXT,
      admission_result TEXT DEFAULT 'Pending',
      certificate_of_admission_no TEXT,
      tuition_fee_paid INTEGER NOT NULL DEFAULT 0,
      courier_name TEXT,
      courier_tracking_number TEXT,
      courier_dispatch_date TEXT,
      checklist_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (applied_university_id) REFERENCES universities(id) ON DELETE RESTRICT,
      FOREIGN KEY (project_id) REFERENCES intake_projects(id) ON DELETE RESTRICT,
      FOREIGN KEY (assigned_consultant_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'Work',
      priority TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('Low', 'Medium', 'High', 'Urgent')),
      task_date TEXT NOT NULL,
      deadline TEXT NOT NULL,
      scheduled_time TEXT,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Completed')),
      created_at TEXT NOT NULL,
      completed_at TEXT,
      notes TEXT,
      last_updated TEXT NOT NULL,
      sync_state TEXT NOT NULL DEFAULT 'synced',
      sheet_row_number INTEGER,
      project_id TEXT,
      student_id TEXT,
      university_id TEXT,
      assigned_to_id TEXT,
      assigned_by_id TEXT,
      subtasks_json TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (project_id) REFERENCES intake_projects(id) ON DELETE SET NULL,
      FOREIGN KEY (student_id) REFERENCES student_applications(id) ON DELETE SET NULL,
      FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_by_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      recipient_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      target_entity TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      read_status INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS google_sheets_config (
      id TEXT PRIMARY KEY,
      selected_spreadsheet_id TEXT NOT NULL,
      selected_spreadsheet_title TEXT NOT NULL,
      selected_worksheet TEXT NOT NULL,
      auto_sync INTEGER NOT NULL DEFAULT 1,
      sync_status TEXT NOT NULL DEFAULT 'Synced',
      last_synced_at TEXT NOT NULL,
      headers_initialized INTEGER NOT NULL DEFAULT 1,
      account_email TEXT NOT NULL,
      account_name TEXT NOT NULL,
      auth_mode TEXT NOT NULL DEFAULT 'workspace_cloud'
    );

    -- Document Handover & Acknowledgement Module Tables
    CREATE TABLE IF NOT EXISTS handover_sequences (
      year INTEGER PRIMARY KEY,
      last_seq INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS document_handovers (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL DEFAULT 1,
      student_id TEXT NOT NULL,
      counselor_id TEXT NOT NULL,
      counselor_name TEXT NOT NULL,
      receiving_employee_id TEXT NOT NULL,
      receiving_employee_name TEXT NOT NULL,
      handover_date TEXT NOT NULL,
      handover_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending Receipt'
        CHECK(status IN ('Pending Receipt', 'Accepted', 'Partially Received', 'Disputed', 'Follow-up Delivered')),
      total_documents INTEGER NOT NULL DEFAULT 1,
      documents_json TEXT NOT NULL DEFAULT '[]',
      follow_up_deliveries_json TEXT NOT NULL DEFAULT '[]',
      general_remarks TEXT,
      package_seal_number TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_acknowledged_at TEXT,
      last_acknowledged_by_id TEXT,
      last_acknowledged_by_name TEXT,
      acknowledgement_type TEXT,
      acknowledgement_notes TEXT,
      dispute_reason TEXT,
      counselor_sheet_sync_status TEXT NOT NULL DEFAULT 'Pending' CHECK(counselor_sheet_sync_status IN ('Pending', 'Synced', 'Failed')),
      receiver_sheet_sync_status TEXT NOT NULL DEFAULT 'Pending' CHECK(receiver_sheet_sync_status IN ('Pending', 'Synced', 'Failed')),
      master_sheet_sync_status TEXT NOT NULL DEFAULT 'Pending' CHECK(master_sheet_sync_status IN ('Pending', 'Synced', 'Failed')),
      last_sync_error TEXT,
      FOREIGN KEY (student_id) REFERENCES student_applications(id) ON DELETE RESTRICT,
      FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (receiving_employee_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (last_acknowledged_by_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS handover_events (
      id TEXT PRIMARY KEY,
      handover_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action_type TEXT NOT NULL
        CHECK(action_type IN ('Created', 'Accepted', 'Partially_Received', 'Disputed', 'FollowUp_Submitted', 'FollowUp_Verified')),
      details TEXT NOT NULL,
      item_states_snapshot TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (handover_id) REFERENCES document_handovers(id) ON DELETE RESTRICT,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS sheets_sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      handover_id TEXT NOT NULL,
      handover_version INTEGER NOT NULL DEFAULT 1,
      target_type TEXT NOT NULL CHECK(target_type IN ('counselor_tab', 'receiver_tab', 'master_tab')),
      worksheet_title TEXT NOT NULL,
      employee_id TEXT,
      row_payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'synced', 'failed', 'superseded')),
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 5,
      next_retry_at TEXT,
      locked_by TEXT,
      locked_at TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      last_attempt_at TEXT,
      synced_at TEXT,
      FOREIGN KEY (handover_id) REFERENCES document_handovers(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS google_sheet_tab_rows (
      spreadsheet_id TEXT NOT NULL,
      worksheet_title TEXT NOT NULL,
      handover_id TEXT NOT NULL,
      handover_version INTEGER NOT NULL DEFAULT 1,
      row_number INTEGER NOT NULL,
      row_payload_json TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      PRIMARY KEY (spreadsheet_id, worksheet_title, handover_id),
      FOREIGN KEY (handover_id) REFERENCES document_handovers(id) ON DELETE RESTRICT
    );

    -- Admission -> Counselor Document Requests Tables
    CREATE TABLE IF NOT EXISTS handover_request_sequences (
      year INTEGER PRIMARY KEY,
      last_seq INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS document_requests (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      requested_by_id TEXT NOT NULL,
      requested_by_name TEXT NOT NULL,
      assigned_counselor_id TEXT NOT NULL,
      assigned_counselor_name TEXT NOT NULL,
      required_documents_json TEXT NOT NULL DEFAULT '[]',
      priority TEXT NOT NULL DEFAULT 'Normal' CHECK(priority IN ('Low', 'Normal', 'High', 'Urgent')),
      deadline TEXT NOT NULL,
      remarks TEXT,
      status TEXT NOT NULL DEFAULT 'Open'
        CHECK(status IN ('Open', 'Handover Submitted', 'In Verification', 'Partially Fulfilled', 'Disputed', 'Completed', 'Cancelled')),
      linked_handover_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (student_id) REFERENCES student_applications(id) ON DELETE RESTRICT,
      FOREIGN KEY (requested_by_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (assigned_counselor_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (linked_handover_id) REFERENCES document_handovers(id) ON DELETE RESTRICT
    );
  `);

  // Immutability triggers to protect handover audit history and handover records from tampering or cascading deletion
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS prevent_handover_events_update
    BEFORE UPDATE ON handover_events
    BEGIN
      SELECT RAISE(ABORT, 'handover_events is append-only and cannot be modified');
    END;

    CREATE TRIGGER IF NOT EXISTS prevent_handover_events_delete
    BEFORE DELETE ON handover_events
    BEGIN
      SELECT RAISE(ABORT, 'handover_events is immutable and cannot be deleted');
    END;

    CREATE TRIGGER IF NOT EXISTS prevent_document_handovers_delete
    BEFORE DELETE ON document_handovers
    BEGIN
      SELECT RAISE(ABORT, 'document_handovers records cannot be deleted');
    END;

    CREATE TRIGGER IF NOT EXISTS prevent_document_requests_delete
    BEFORE DELETE ON document_requests
    BEGIN
      SELECT RAISE(ABORT, 'document_requests records cannot be deleted');
    END;
  `);

  // Ensure request_id exists on document_handovers for linking Admission -> Counselor requests to handovers
  ensureColumnExists('document_handovers', 'request_id', 'TEXT');

  // Indexes for relational lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_student ON tasks(student_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to_id);
    CREATE INDEX IF NOT EXISTS idx_students_project ON student_applications(project_id);
    CREATE INDEX IF NOT EXISTS idx_students_consultant ON student_applications(assigned_consultant_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_programs_university ON university_programs(university_id);
    CREATE INDEX IF NOT EXISTS idx_documents_university ON university_documents(university_id);
    CREATE INDEX IF NOT EXISTS idx_handovers_student ON document_handovers(student_id);
    CREATE INDEX IF NOT EXISTS idx_handovers_counselor ON document_handovers(counselor_id);
    CREATE INDEX IF NOT EXISTS idx_handovers_receiver ON document_handovers(receiving_employee_id);
    CREATE INDEX IF NOT EXISTS idx_handovers_status ON document_handovers(status);
    CREATE INDEX IF NOT EXISTS idx_handovers_request ON document_handovers(request_id);
    CREATE INDEX IF NOT EXISTS idx_doc_requests_student ON document_requests(student_id);
    CREATE INDEX IF NOT EXISTS idx_doc_requests_requester ON document_requests(requested_by_id);
    CREATE INDEX IF NOT EXISTS idx_doc_requests_counselor ON document_requests(assigned_counselor_id);
    CREATE INDEX IF NOT EXISTS idx_doc_requests_status ON document_requests(status);
    CREATE INDEX IF NOT EXISTS idx_doc_requests_handover ON document_requests(linked_handover_id);
    CREATE INDEX IF NOT EXISTS idx_handover_events_hnd ON handover_events(handover_id);
    CREATE INDEX IF NOT EXISTS idx_sheets_queue_status_next ON sheets_sync_queue(status, next_retry_at);
    CREATE INDEX IF NOT EXISTS idx_sheets_queue_handover ON sheets_sync_queue(handover_id, target_type, handover_version);
  `);

  // Ensure newly added columns exist in SQLite tables
  ensureColumnExists('universities', 'verification_status', "TEXT NOT NULL DEFAULT 'Verified'");
  ensureColumnExists('universities', 'last_verified_at', 'TEXT');
  ensureColumnExists('universities', 'verified_by', 'TEXT');

  ensureColumnExists('admission_intakes', 'interview_dates', 'TEXT');
  ensureColumnExists('admission_intakes', 'result_announcement_date', 'TEXT');
  ensureColumnExists('admission_intakes', 'tuition_payment_deadline', 'TEXT');
  ensureColumnExists('admission_intakes', 'document_deadline', 'TEXT');
  ensureColumnExists('admission_intakes', 'visa_submission_deadline', 'TEXT');
  ensureColumnExists('admission_intakes', 'classes_start_date', 'TEXT');
  ensureColumnExists('admission_intakes', 'verification_status', "TEXT NOT NULL DEFAULT 'Verified'");
  ensureColumnExists('admission_intakes', 'last_verified_at', 'TEXT');

  ensureColumnExists('student_applications', 'program_id', 'TEXT');
  ensureColumnExists('student_applications', 'program_name', 'TEXT');

  // Ensure team columns exist
  ensureColumnExists('users', 'team', "TEXT DEFAULT 'Admission Team'");
  ensureColumnExists('tasks', 'team', 'TEXT');

  // 2. Seed initial team members if table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    seedInitialConsultancyData();
  }

  // 3. Ensure both teams are populated (Admission: 9 members, Counseling: 11 members)
  ensureTeamMembersSeeded();

  // 4. Seed or refresh university details (programs, refund policies, bank accounts, docs)
  seedUniversityDetails();

  // 5. Seed realistic team tasks if tasks table has few or zero tasks
  seedTeamTasksIfEmpty();

  // 6. Migrate legacy tasks from JSON if exists and not already imported
  migrateLegacyTasksIfPresent();

  // 7. Create an automatic backup snapshot
  createBackupSnapshot();
}

function ensureColumnExists(table: string, column: string, definition: string): void {
  try {
    const pragma = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    const exists = pragma.some((c) => c.name === column);
    if (!exists) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  } catch (err) {
    // Column might already exist
  }
}

function seedInitialConsultancyData(): void {
  const now = new Date().toISOString();

  // Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, role, title, avatar, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    'USR-ADMIN',
    'Samiul Alam',
    'samiul.wecare@gmail.com',
    'Admission_Manager',
    'Head of Admissions & Visa Processing',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    '+82-10-8291-4401',
    now
  );
  insertUser.run(
    'USR-CONSULTANT-1',
    'Min-Ji Park',
    'minji.park@wecare-consulting.kr',
    'Consultant',
    'Senior Korean University Counselor',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    '+82-10-3329-8812',
    now
  );
  insertUser.run(
    'USR-CONSULTANT-2',
    'Hannah Lee',
    'hannah.lee@wecare-consulting.kr',
    'Consultant',
    'Visa Officer & Document Notarization Specialist',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    '+82-10-9901-2311',
    now
  );
  insertUser.run(
    'USR-CONSULTANT-3',
    'David Kim',
    'david.kim@wecare-consulting.kr',
    'Consultant',
    'Korean Language Center & D-4 Coordinator',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    '+82-10-4412-7789',
    now
  );

  // Universities
  const insertUni = db.prepare(`
    INSERT INTO universities (id, name_en, name_ko, city, ranking, website_url, topik_requirement, ielts_requirement, bank_balance_usd, accredited, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUni.run(
    'UNI-SNU',
    'Seoul National University',
    '서울대학교',
    'Seoul (Gwanak-gu)',
    'QS World #41 / Korea #1',
    'https://en.snu.ac.kr',
    'TOPIK Level 3 minimum (Level 5 recommended for Humanities)',
    'IELTS 6.5 minimum (English track)',
    20000,
    1,
    'Top national university. Highly selective, apostilled high school degree must be notarized before deadline.',
    now,
    now
  );
  insertUni.run(
    'UNI-YONSEI',
    'Yonsei University',
    '연세대학교',
    'Seoul (Sinchon)',
    'QS World #76 / SKY',
    'https://www.yonsei.ac.kr/en_sc/',
    'TOPIK Level 4 / Underwood College requires IELTS 6.5+',
    'IELTS 6.5 minimum',
    20000,
    1,
    'Underwood International College (UIC) provides 100% English medium instruction.',
    now,
    now
  );
  insertUni.run(
    'UNI-KOREA',
    'Korea University',
    '고려대학교',
    'Seoul (Anam)',
    'QS World #79 / SKY',
    'https://www.korea.edu',
    'TOPIK Level 3 or higher',
    'IELTS 6.0 minimum',
    20000,
    1,
    'Strong Business and Engineering programs. Strict financial affidavit verification.',
    now,
    now
  );
  insertUni.run(
    'UNI-KAIST',
    'KAIST',
    '한국과학기술원',
    'Daejeon (Yuseong)',
    'Top Tech Institute (#56)',
    'https://www.kaist.ac.kr/en/',
    'Exempt if English track, Korean recommended',
    'IELTS 6.5 or TOEFL iBT 83+',
    16000,
    1,
    'Tuition scholarship covers all international admitted students with GPA maintenance.',
    now,
    now
  );
  insertUni.run(
    'UNI-SKKU',
    'Sungkyunkwan University',
    '성균관대학교',
    'Seoul / Suwon',
    'QS World #145 / Samsung Supported',
    'https://www.skku.edu/eng/',
    'TOPIK Level 3 or higher',
    'IELTS 5.5 minimum',
    20000,
    1,
    'Samsung partnership offers substantial STEM scholarships and internship opportunities.',
    now,
    now
  );

  // Admission Intakes
  const insertIntake = db.prepare(`
    INSERT INTO admission_intakes (id, university_id, term, academic_year, application_start, application_deadline, quota, status, required_documents)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const stdDocs = JSON.stringify([
    'Valid Passport Copy',
    'Apostilled High School / Degree Certificate',
    'Apostilled Official Transcripts',
    'Bank Balance Certificate ($20,000 USD, 30 days valid)',
    'Family Relationship Certificate (Birth Certificate)',
    'Study Plan & Statement of Purpose',
    'TOPIK or English Test Score Report',
  ]);

  insertIntake.run('INT-SNU-2027S', 'UNI-SNU', 'Spring 2027', 2027, '2026-07-01', '2026-08-30', 35, 'Open', stdDocs);
  insertIntake.run('INT-YONSEI-2027S', 'UNI-YONSEI', 'Spring 2027', 2027, '2026-08-01', '2026-09-25', 40, 'Open', stdDocs);
  insertIntake.run('INT-YONSEI-2027F', 'UNI-YONSEI', 'Fall 2027', 2027, '2027-01-10', '2027-03-15', 50, 'Upcoming', stdDocs);
  insertIntake.run('INT-KOREA-2027S', 'UNI-KOREA', 'Spring 2027', 2027, '2026-08-10', '2026-09-30', 30, 'Open', stdDocs);
  insertIntake.run('INT-SKKU-2027S', 'UNI-SKKU', 'Spring 2027', 2027, '2026-08-15', '2026-10-10', 45, 'Open', stdDocs);

  // Intake Projects
  const insertProject = db.prepare(`
    INSERT INTO intake_projects (id, name, university_id, intake_id, intake_term, academic_year, manager_id, status, start_date, deadline, target_quota, progress_percentage, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProject.run(
    'PRJ-SNU-2027S',
    'Seoul National University — Spring 2027 International Intake',
    'UNI-SNU',
    'INT-SNU-2027S',
    'Spring 2027',
    2027,
    'USR-ADMIN',
    'Active',
    '2026-07-01',
    '2026-08-30',
    25,
    68,
    'Primary cohort targeting Undergraduate and Master degrees. Requires apostilled documents prior to portal upload.',
    now,
    now
  );
  insertProject.run(
    'PRJ-YONSEI-2027S',
    'Yonsei University — Underwood College Spring 2027 Admissions',
    'UNI-YONSEI',
    'INT-YONSEI-2027S',
    'Spring 2027',
    2027,
    'USR-ADMIN',
    'Active',
    '2026-08-01',
    '2026-09-25',
    30,
    45,
    'English track applications. Interview scheduling commences October.',
    now,
    now
  );
  insertProject.run(
    'PRJ-KOREA-2027S',
    'Korea University — Global Business & Engineering Spring 2027',
    'UNI-KOREA',
    'INT-KOREA-2027S',
    'Spring 2027',
    2027,
    'USR-ADMIN',
    'Active',
    '2026-08-10',
    '2026-09-30',
    20,
    30,
    'Coordinate with Anam International Office for direct courier submissions.',
    now,
    now
  );

  // Link consultants to projects
  const insertProjectConsultant = db.prepare(`
    INSERT INTO project_consultants (project_id, user_id, assigned_at)
    VALUES (?, ?, ?)
  `);
  insertProjectConsultant.run('PRJ-SNU-2027S', 'USR-CONSULTANT-1', now);
  insertProjectConsultant.run('PRJ-SNU-2027S', 'USR-CONSULTANT-2', now);
  insertProjectConsultant.run('PRJ-YONSEI-2027S', 'USR-CONSULTANT-1', now);
  insertProjectConsultant.run('PRJ-YONSEI-2027S', 'USR-CONSULTANT-3', now);
  insertProjectConsultant.run('PRJ-KOREA-2027S', 'USR-CONSULTANT-2', now);

  // Students
  const insertStudent = db.prepare(`
    INSERT INTO student_applications (
      id, full_name, passport_number, date_of_birth, nationality, contact_email, contact_phone,
      applied_university_id, project_id, department, major, degree_level, intake_term,
      visa_stage, visa_type, assigned_consultant_id, submission_date, admission_result,
      certificate_of_admission_no, tuition_fee_paid, courier_name, courier_tracking_number,
      courier_dispatch_date, checklist_json, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const studentChecklist1 = JSON.stringify([
    { id: 'c1', name: 'Passport Copy (6+ mo valid)', required: true, status: 'Verified', verifiedBy: 'Hannah Lee' },
    { id: 'c2', name: 'Apostilled High School Diploma', required: true, status: 'Apostilled', verifiedBy: 'Hannah Lee' },
    { id: 'c3', name: 'Official Transcripts', required: true, status: 'Verified', verifiedBy: 'Min-Ji Park' },
    { id: 'c4', name: 'Bank Balance Certificate ($20,000 USD)', required: true, status: 'Verified', verifiedBy: 'Hannah Lee' },
    { id: 'c5', name: 'Family Relationship Certificate', required: true, status: 'Notarized', verifiedBy: 'Hannah Lee' },
    { id: 'c6', name: 'Study Plan & Essay', required: true, status: 'Verified', verifiedBy: 'Min-Ji Park' },
    { id: 'c7', name: 'TOPIK Level 4 Score Certificate', required: true, status: 'Verified', verifiedBy: 'Min-Ji Park' },
  ]);

  insertStudent.run(
    'STU-2027-001',
    'Kim Min-jun',
    'M89218492',
    '2004-03-15',
    'Uzbekistan',
    'minjun.kim.candidate@gmail.com',
    '+998-90-123-4567',
    'UNI-SNU',
    'PRJ-SNU-2027S',
    'College of Engineering',
    'Computer Science & Artificial Intelligence',
    'Bachelor (D-2-2)',
    'Spring 2027',
    'CoA_Received',
    'D-2',
    'USR-CONSULTANT-1',
    '2026-08-15',
    'Accepted',
    'COA-2027-SNU-0841',
    1,
    'DHL Express',
    'DHL-9921-8840-KR',
    '2026-08-20',
    studentChecklist1,
    'Tuition verified on Shinhan wire transfer receipt. CoA received from SNU OIA. Ready for Embassy visa interview.',
    now,
    now
  );

  const studentChecklist2 = JSON.stringify([
    { id: 'c1', name: 'Passport Copy', required: true, status: 'Verified' },
    { id: 'c2', name: 'Apostilled Bachelor Degree', required: true, status: 'Apostilled' },
    { id: 'c3', name: 'Official Transcripts', required: true, status: 'Verified' },
    { id: 'c4', name: 'Bank Certificate ($20,000 USD)', required: true, status: 'Verified' },
    { id: 'c5', name: 'Statement of Purpose', required: true, status: 'Verified' },
    { id: 'c6', name: 'IELTS 7.0 Score Card', required: true, status: 'Verified' },
  ]);

  insertStudent.run(
    'STU-2027-002',
    'Amina Rahman',
    'B19827402',
    '2001-11-20',
    'Bangladesh',
    'amina.rahman.edu@gmail.com',
    '+880-171-889-1029',
    'UNI-YONSEI',
    'PRJ-YONSEI-2027S',
    'Underwood International College',
    'International Commerce & Relations',
    'Master (D-2-3)',
    'Spring 2027',
    'University_Submitted',
    'D-2',
    'USR-CONSULTANT-2',
    '2026-08-28',
    'Pending',
    null,
    0,
    'DHL Express',
    'DHL-4482-1092-KR',
    '2026-08-29',
    studentChecklist2,
    'Hardcopy dossier dispatched via DHL Express to Yonsei Underwood Admissions Office. Tracking active.',
    now,
    now
  );

  const studentChecklist3 = JSON.stringify([
    { id: 'c1', name: 'Passport Copy', required: true, status: 'Verified' },
    { id: 'c2', name: 'High School Diploma', required: true, status: 'Pending' },
    { id: 'c3', name: 'Financial Balance Certificate ($16,000 USD)', required: true, status: 'Collected' },
    { id: 'c4', name: 'Family Relationship Verification', required: true, status: 'Pending' },
  ]);

  insertStudent.run(
    'STU-2027-003',
    'Tran Van Minh',
    'V09384912',
    '2005-06-12',
    'Vietnam',
    'tran.minh.krstudy@yahoo.com',
    '+84-98-331-2940',
    'UNI-KOREA',
    'PRJ-KOREA-2027S',
    'Korean Language Center',
    'Intensive Korean Immersion (Level 1-4)',
    'Korean Language (D-4-1)',
    'Spring 2027',
    'Apostille_Verification',
    'D-4',
    'USR-CONSULTANT-3',
    null,
    'Pending',
    null,
    0,
    null,
    null,
    null,
    studentChecklist3,
    'Awaiting Vietnam Ministry of Foreign Affairs apostille stamp on high school certificate.',
    now,
    now
  );

  // Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, recipient_id, sender_id, title, message, type, target_entity, target_entity_id, read_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotif.run(
    'NTF-101',
    'USR-CONSULTANT-1',
    'USR-ADMIN',
    'New Task Assigned: Verify Apostille for Kim Min-jun',
    'Admission Manager assigned you task TSK-101: Review Shinhan Bank balance certification and submit Certificate of Admission.',
    'task_assigned',
    'student',
    'STU-2027-001',
    0,
    new Date(Date.now() - 3600000 * 2).toISOString()
  );
  insertNotif.run(
    'NTF-102',
    'USR-CONSULTANT-2',
    'USR-ADMIN',
    'Urgent Deadline Approaching: Yonsei Spring 2027',
    'Only 14 days remaining before Yonsei Underwood International College application portal closes.',
    'deadline_warning',
    'project',
    'PRJ-YONSEI-2027S',
    0,
    new Date(Date.now() - 3600000 * 5).toISOString()
  );
  insertNotif.run(
    'NTF-103',
    'USR-ADMIN',
    'USR-CONSULTANT-1',
    'Task Completed: Kim Min-jun CoA Received',
    'Min-Ji Park completed verification and uploaded CoA number COA-2027-SNU-0841.',
    'task_completed',
    'student',
    'STU-2027-001',
    1,
    new Date(Date.now() - 86400000).toISOString()
  );

  // Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(
    'AUD-001',
    'USR-ADMIN',
    'Samiul Alam',
    'Admission_Manager',
    'CREATE_PROJECT',
    'project',
    'PRJ-SNU-2027S',
    'Initialized Seoul National University Spring 2027 Intake Campaign (Quota: 25)',
    new Date(Date.now() - 86400000 * 3).toISOString()
  );
  insertAudit.run(
    'AUD-002',
    'USR-CONSULTANT-1',
    'Min-Ji Park',
    'Consultant',
    'UPDATE_VISA_STAGE',
    'student',
    'STU-2027-001',
    'Advanced Kim Min-jun visa stage to CoA_Received (Cert: COA-2027-SNU-0841)',
    new Date(Date.now() - 3600000 * 4).toISOString()
  );
  insertAudit.run(
    'AUD-003',
    'USR-CONSULTANT-2',
    'Hannah Lee',
    'Consultant',
    'DISPATCH_DHL',
    'student',
    'STU-2027-002',
    'Logged DHL tracking DHL-4482-1092-KR for Yonsei UIC hardcopy package',
    new Date(Date.now() - 3600000 * 1).toISOString()
  );

  // Google Sheets Config Table
  const insertConfig = db.prepare(`
    INSERT INTO google_sheets_config (
      id, selected_spreadsheet_id, selected_spreadsheet_title, selected_worksheet,
      auto_sync, sync_status, last_synced_at, headers_initialized, account_email, account_name, auth_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertConfig.run(
    'config_main',
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    'Personal Daily Task Master 2026',
    'Daily_Tasks_2026',
    1,
    'Synced',
    now,
    1,
    'samiul.wecare@gmail.com',
    'Samiul (Personal Google Workspace)',
    'workspace_cloud'
  );
}

function migrateLegacyTasksIfPresent(): void {
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
  if (existingCount.count > 0) return;

  if (fs.existsSync(LEGACY_JSON_PATH)) {
    try {
      const raw = fs.readFileSync(LEGACY_JSON_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.tasks)) {
        const insertTask = db.prepare(`
          INSERT INTO tasks (
            id, title, description, category, priority, task_date, deadline,
            scheduled_time, status, created_at, completed_at, notes, last_updated,
            sync_state, sheet_row_number, project_id, student_id, university_id,
            assigned_to_id, assigned_by_id, subtasks_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction((taskList: any[]) => {
          for (let i = 0; i < taskList.length; i++) {
            const t = taskList[i];
            insertTask.run(
              t.id,
              t.title || 'Untitled Task',
              t.description || '',
              t.category || 'Work',
              t.priority || 'Medium',
              t.taskDate || new Date().toISOString().slice(0, 10),
              t.deadline || t.taskDate || new Date().toISOString().slice(0, 10),
              t.scheduledTime || null,
              t.status || 'Pending',
              t.createdAt || new Date().toISOString(),
              t.completedAt || null,
              t.notes || '',
              t.lastUpdated || new Date().toISOString(),
              t.syncState || 'synced',
              t.sheetRowNumber || i + 2,
              i === 0 ? 'PRJ-SNU-2027S' : i === 1 ? 'PRJ-YONSEI-2027S' : null,
              i === 0 ? 'STU-2027-001' : null,
              i === 0 ? 'UNI-SNU' : null,
              i % 2 === 0 ? 'USR-CONSULTANT-1' : 'USR-CONSULTANT-2',
              'USR-ADMIN',
              '[]'
            );
          }
        });

        insertMany(data.tasks);
        console.log(`[SQLite Migration] Migrated ${data.tasks.length} existing tasks to relational SQLite.`);
        return;
      }
    } catch (err) {
      console.warn('[SQLite Migration] Could not migrate legacy tasks, seeding fresh tasks:', err);
    }
  }

  // Fallback initial tasks
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const insertTask = db.prepare(`
    INSERT INTO tasks (
      id, title, description, category, priority, task_date, deadline,
      scheduled_time, status, created_at, completed_at, notes, last_updated,
      sync_state, sheet_row_number, project_id, student_id, university_id,
      assigned_to_id, assigned_by_id, subtasks_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTask.run(
    'TSK-1001',
    'Audit Seoul National University Spring 2027 Intake Submissions',
    'Review candidate financial affidavits and ensure apostille stamps meet Korean Ministry of Justice specifications.',
    'Work',
    'High',
    today,
    today,
    '14:30',
    'Pending',
    now,
    null,
    'Verify $20,000 USD bank balance validity within 30 days.',
    now,
    'synced',
    2,
    'PRJ-SNU-2027S',
    'STU-2027-001',
    'UNI-SNU',
    'USR-CONSULTANT-1',
    'USR-ADMIN',
    JSON.stringify([
      { id: 's1', title: 'Verify passport validity >= 6 months', completed: true },
      { id: 's2', title: 'Confirm Shinhan wire confirmation', completed: true },
      { id: 's3', title: 'File D-2 Certificate of Admission', completed: false },
    ])
  );
  insertTask.run(
    'TSK-1002',
    'Prepare Yonsei Underwood College DHL Courier Dispatch Package',
    'Consolidate certified transcripts, personal statements, and fee receipts into secure DHL parcel to Yonsei OIA.',
    'Business',
    'Urgent',
    today,
    today,
    '16:00',
    'Pending',
    now,
    null,
    'Courier tracking code DHL-4482-1092-KR.',
    now,
    'synced',
    3,
    'PRJ-YONSEI-2027S',
    'STU-2027-002',
    'UNI-YONSEI',
    'USR-CONSULTANT-2',
    'USR-ADMIN',
    '[]'
  );
}

export function seedUniversityDetails(): void {
  const now = new Date().toISOString();
  const verifiedDate = '2026-11-01T09:00:00.000Z';
  const verifier = 'Samiul Alam (Head of Admissions)';

  // 1. Update verification metadata on universities
  db.prepare(`
    UPDATE universities SET
      verification_status = 'Verified',
      last_verified_at = ?,
      verified_by = ?
    WHERE verification_status IS NULL OR verification_status = ''
  `).run(verifiedDate, verifier);

  // 2. Update admission intakes with key dates
  db.prepare(`
    UPDATE admission_intakes SET
      application_start = '2026-10-01',
      application_deadline = '2026-11-30',
      document_deadline = '2026-12-05',
      result_announcement_date = '2027-01-15',
      tuition_payment_deadline = '2027-02-01',
      visa_submission_deadline = '2027-02-15',
      classes_start_date = '2027-03-01',
      interview_dates = '2026-12-10 ~ 2026-12-20',
      verification_status = 'Verified',
      last_verified_at = ?
    WHERE id = 'INT-SNU-2027S'
  `).run(verifiedDate);

  db.prepare(`
    UPDATE admission_intakes SET
      document_deadline = '2026-10-05',
      visa_submission_deadline = '2026-12-28',
      classes_start_date = '2027-03-02',
      interview_dates = '2026-10-18 ~ 2026-10-28 (Online Zoom)',
      result_announcement_date = '2026-11-27',
      tuition_payment_deadline = '2026-12-15',
      verification_status = 'Verified',
      last_verified_at = ?
    WHERE id = 'INT-YONSEI-2027S'
  `).run(verifiedDate);

  db.prepare(`
    UPDATE admission_intakes SET
      document_deadline = '2027-03-25',
      visa_submission_deadline = '2027-07-15',
      classes_start_date = '2027-09-01',
      interview_dates = '2027-04-10 ~ 2027-04-20',
      result_announcement_date = '2027-05-30',
      tuition_payment_deadline = '2027-06-25',
      verification_status = 'Verified',
      last_verified_at = ?
    WHERE id = 'INT-YONSEI-2027F'
  `).run(verifiedDate);

  db.prepare(`
    UPDATE admission_intakes SET
      document_deadline = '2026-10-10',
      visa_submission_deadline = '2027-01-05',
      classes_start_date = '2027-03-02',
      interview_dates = '2026-10-25 ~ 2026-11-05',
      result_announcement_date = '2026-12-05',
      tuition_payment_deadline = '2026-12-20',
      verification_status = 'Verified',
      last_verified_at = ?
    WHERE id = 'INT-KOREA-2027S'
  `).run(verifiedDate);

  db.prepare(`
    UPDATE admission_intakes SET
      document_deadline = '2026-10-15',
      visa_submission_deadline = '2027-01-10',
      classes_start_date = '2027-03-02',
      interview_dates = '2026-11-01 ~ 2026-11-12',
      result_announcement_date = '2026-12-12',
      tuition_payment_deadline = '2026-12-30',
      verification_status = 'Verified',
      last_verified_at = ?
    WHERE id = 'INT-SKKU-2027S'
  `).run(verifiedDate);

  // Add KAIST Intakes if not present
  const kaistIntake = db.prepare('SELECT id FROM admission_intakes WHERE university_id = ?').get('UNI-KAIST');
  if (!kaistIntake) {
    db.prepare(`
      INSERT INTO admission_intakes (id, university_id, term, academic_year, application_start, application_deadline, quota, status, required_documents, interview_dates, result_announcement_date, tuition_payment_deadline, verification_status, last_verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'INT-KAIST-2027S',
      'UNI-KAIST',
      'Spring 2027',
      2027,
      '2026-08-01',
      '2026-09-20',
      25,
      'Open',
      JSON.stringify(['Passport Copy', 'High School Transcript', 'Apostilled Diploma', 'Recommendation Letter (Math/Science)', 'English Test Score (IELTS 6.5+ / TOEFL 83+)', 'Financial Statement $16,000 USD']),
      '2026-10-20 ~ 2026-10-30',
      '2026-11-25',
      '2026-12-15',
      'Verified',
      verifiedDate
    );
  }

  // 3. Seed Programs
  const insertProgram = db.prepare(`
    INSERT OR REPLACE INTO university_programs (
      id, university_id, name, code, degree_level, duration, tuition_fee_krw, tuition_fee_usd,
      application_fee_krw, requirements, language_of_instruction, intake_terms, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  // SNU Programs
  insertProgram.run(
    'PRG-SNU-KLP',
    'UNI-SNU',
    'Korean Language Regular Program (KLP)',
    'KLP',
    'Korean Language (D-4-1)',
    '4 Quarters (10 weeks/quarter, 200 hrs/term, 1 Year)',
    1730000,
    1310,
    80000,
    'High school graduation certificate or higher, valid passport with 6+ months validity, financial affidavit of $10,000 USD.',
    'Korean',
    JSON.stringify(['Spring 2027', 'Summer 2027', 'Fall 2027', 'Winter 2026/27']),
    now,
    now
  );
  insertProgram.run(
    'PRG-SNU-BS-CS',
    'UNI-SNU',
    'Bachelor of Computer Science & AI (College of Engineering)',
    'BS-CS',
    'Bachelor (D-2-2)',
    '4 Years (8 Semesters)',
    2998000,
    2280,
    150000,
    'Apostilled High School Diploma & Transcripts, TOPIK Level 3+ or IELTS 6.5+ (English Track), $20,000 USD bank certificate.',
    'Bilingual (Korean + English)',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );
  insertProgram.run(
    'PRG-SNU-KSU',
    'UNI-SNU',
    'Korean Studies & Literature Undergraduate (KSU)',
    'KSU',
    'Bachelor (D-2-2)',
    '4 Years (8 Semesters)',
    2442000,
    1850,
    150000,
    'TOPIK Level 4+ mandatory, verified parental family relations certificate, statement of purpose, academic study plan.',
    'Korean',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );
  insertProgram.run(
    'PRG-SNU-MS-GSIS',
    'UNI-SNU',
    'Master of International Commerce & Area Studies (GSIS)',
    'MS-IC',
    'Master (D-2-3)',
    '2 Years (4 Semesters)',
    3270000,
    2490,
    150000,
    'Bachelor Degree (Apostilled), IELTS 7.0 or TOEFL iBT 90+, 2 Academic Letters of Recommendation, CV.',
    'English 100%',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );
  insertProgram.run(
    'PRG-SNU-PHD-ECE',
    'UNI-SNU',
    'Doctor of Philosophy in Electrical & Computer Engineering',
    'PHD-ECE',
    'Doctorate (D-2-4)',
    '3 Years (6 Semesters)',
    3450000,
    2620,
    150000,
    'Master Degree in CS/EE, Pre-approval from SNU laboratory faculty advisor, English IELTS 6.5+, research prospectus.',
    'English / Korean',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );
  insertProgram.run(
    'PRG-SNU-EAP',
    'UNI-SNU',
    'English Academic Program',
    'EAP',
    'Undergraduate Exchange / Pathway',
    '1 Year',
    3800000,
    2880,
    100000,
    'High school diploma or university enrollment, English proficiency IELTS 6.0+ or TOEFL 80+.',
    'English 100%',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );

  // Yonsei Programs
  insertProgram.run(
    'PRG-YON-KLP',
    'UNI-YONSEI',
    'Yonsei KLI Regular Korean Language Program (KLP)',
    'KLP',
    'Korean Language (D-4-1)',
    '4 Quarters (10 weeks/quarter, 200 class hrs)',
    1770000,
    1340,
    80000,
    'High school diploma or degree equivalent, copy of passport, verified parent certificate, $10,000 USD bank cert.',
    'Korean',
    JSON.stringify(['Spring 2027', 'Summer 2027', 'Fall 2027', 'Winter 2026/27']),
    now,
    now
  );
  insertProgram.run(
    'PRG-YON-UIC-BS',
    'UNI-YONSEI',
    'Underwood International College (UIC) - Global B.A. / B.S.',
    'UIC-BS',
    'Bachelor (D-2-2)',
    '4 Years (8 Semesters)',
    7024000,
    5350,
    150000,
    '100% English curriculum. IELTS 6.5+ or TOEFL iBT 83+, Common App or Yonsei Portal submission, Video Interview, Bank balance $20,000 USD.',
    'English 100%',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );
  insertProgram.run(
    'PRG-YON-EAP',
    'UNI-YONSEI',
    'English Academic Pathway (EAP Foundation)',
    'EAP',
    'Exchange (D-2-6)',
    '1 Year (2 Semesters)',
    3800000,
    2890,
    100000,
    'Secondary education GPA 3.0/4.0+, IELTS 5.5 minimum. Designed for smooth transition into Yonsei degree tracks.',
    'English',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );
  insertProgram.run(
    'PRG-YON-GSIS-MS',
    'UNI-YONSEI',
    'Graduate School of International Studies (GSIS - Global Affairs)',
    'GSIS-MS',
    'Master (D-2-3)',
    '2 Years (4 Semesters)',
    6100000,
    4640,
    150000,
    'Recognized 4-year Bachelor degree, IELTS 7.0 or TOEFL 90+, Statement of Purpose, 2 letters of recommendation.',
    'English 100%',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );

  // Korea University Programs
  insertProgram.run(
    'PRG-KU-KLC',
    'UNI-KOREA',
    'Korea University KLC Regular Korean Immersion Program (KLP)',
    'KLP',
    'Korean Language (D-4-1)',
    '4 Terms (10 weeks/term)',
    1750000,
    1320,
    80000,
    'High school graduation, $10,000 USD bank certificate valid within 30 days, clean criminal record clearance.',
    'Korean',
    JSON.stringify(['Spring 2027', 'Summer 2027', 'Fall 2027', 'Winter 2026/27']),
    now,
    now
  );
  insertProgram.run(
    'PRG-KU-KSU',
    'UNI-KOREA',
    'Korean Studies Undergraduate Track (KSU)',
    'KSU',
    'Bachelor (D-2-2)',
    '4 Years (8 Semesters)',
    4200000,
    3190,
    150000,
    'TOPIK Level 3+, Apostilled diplomas and transcripts, $20,000 USD bank affidavit.',
    'Bilingual (Korean / English)',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );
  insertProgram.run(
    'PRG-KU-KUBS',
    'UNI-KOREA',
    'Korea University Business School (KUBS) - Global BBA',
    'KUBS-BBA',
    'Bachelor (D-2-2)',
    '4 Years (8 Semesters)',
    4350000,
    3300,
    150000,
    'AACSB/EQUIS Accredited. IELTS 6.5+ or TOPIK 4+, secondary school diploma, competitive quantitative aptitude.',
    'English / Korean',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );
  insertProgram.run(
    'PRG-KU-ENG-MS',
    'UNI-KOREA',
    'Master of Science in Computer Science & Engineering',
    'MS-CSE',
    'Master (D-2-3)',
    '2 Years (4 Semesters)',
    5800000,
    4400,
    150000,
    'Bachelor in Computing/Engineering, IELTS 6.5, Academic resume, Statement of Purpose.',
    'English / Korean',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );

  // KAIST Programs
  insertProgram.run(
    'PRG-KAIST-ENG-BS',
    'UNI-KAIST',
    'KAIST International Undergraduate Program (School of Computing & Engineering)',
    'KAIST-BS',
    'Bachelor (D-2-2)',
    '4 Years (8 Semesters)',
    0,
    0,
    105000,
    '100% Covered by KAIST International Student Scholarship (with 350,000 KRW/month living allowance). IELTS 6.5+ or TOEFL 83+, Math/Science excellence, Teacher Recommendation Letter, $16,000 USD financial cert.',
    'English 100%',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );
  insertProgram.run(
    'PRG-KAIST-AI-MS',
    'UNI-KAIST',
    'Graduate School of AI (KAIST AI) - Master Degree',
    'MS-AI',
    'Master (D-2-3)',
    '2 Years (4 Semesters)',
    0,
    0,
    105000,
    'Full Tuition Scholarship + Monthly Research Assistantship. CS/Math/Engineering Bachelor, Code portfolio, IELTS 6.5+.',
    'English 100%',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );
  insertProgram.run(
    'PRG-KAIST-ROB-PHD',
    'UNI-KAIST',
    'Doctor of Philosophy in Robotics & Mechanical Systems',
    'PHD-ROB',
    'Doctorate (D-2-4)',
    '3-4 Years',
    0,
    0,
    105000,
    'Full Scholarship + Lab research stipend. Master degree, 2 publications or thesis draft, Advisor consent.',
    'English 100%',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );

  // SKKU Programs
  insertProgram.run(
    'PRG-SKKU-SLI',
    'UNI-SKKU',
    'Sungkyun Language Institute (SLI) Korean Regular Program',
    'KLP',
    'Korean Language (D-4-1)',
    '4 Terms (10 weeks/term)',
    1600000,
    1210,
    60000,
    'High School Graduation, Bank balance $10,000 USD, Valid passport.',
    'Korean',
    JSON.stringify(['Spring 2027', 'Summer 2027', 'Fall 2027', 'Winter 2026/27']),
    now,
    now
  );
  insertProgram.run(
    'PRG-SKKU-GBA',
    'UNI-SKKU',
    'Global Business Administration (GBA) - Samsung Supported',
    'GBA-BS',
    'Bachelor (D-2-2)',
    '4 Years (8 Semesters)',
    5100000,
    3880,
    100000,
    '100% English medium. IELTS 6.0+ or TOEFL 80+, Samsung internship eligibility, $20,000 USD bank cert.',
    'English 100%',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );
  insertProgram.run(
    'PRG-SKKU-SEMI',
    'UNI-SKKU',
    'Semiconductor Systems Engineering (Bachelor)',
    'SEMI-BS',
    'Bachelor (D-2-2)',
    '4 Years (8 Semesters)',
    5400000,
    4100,
    100000,
    'Direct Samsung Electronics talent track. Strong Math/Physics foundation, TOPIK 3+ or IELTS 6.0+.',
    'Bilingual (Korean + English)',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );
  insertProgram.run(
    'PRG-SKKU-GSB-MS',
    'UNI-SKKU',
    'SKK Graduate School of Business (SKK GSB) - Full-Time MBA',
    'GSB-MBA',
    'Master (D-2-3)',
    '1.5 Years (3 Semesters)',
    7200000,
    5480,
    120000,
    'Partnership with MIT Sloan. Bachelor degree, 2+ years work experience preferred, GMAT/GRE or SKKU Test, IELTS 6.5+.',
    'English 100%',
    JSON.stringify(['Spring 2027', 'Fall 2027']),
    now,
    now
  );

  // 4. Seed Refund Policies
  const insertRefund = db.prepare(`
    INSERT OR REPLACE INTO university_refund_policies (
      university_id, app_fee_refundable, app_fee_conditions, tuition_refund_policy,
      visa_rejection_refund, deadlines_description, refund_processing_time,
      verification_status, last_verified_at, verified_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRefund.run(
    'UNI-SNU',
    0,
    'Non-refundable once application is submitted.',
    '70% before semester, 50% after class commencement (under Ministry of Education Regulations).',
    '100% full refund upon presentation of official Embassy visa refusal confirmation notice.',
    'Before classes start',
    '15 to 20 business days via international wire transfer.',
    'Verified',
    '2027-01-10T09:00:00.000Z',
    verifier,
    now
  );

  insertRefund.run(
    'UNI-YONSEI',
    0,
    'Application fee of KRW 150,000 is strictly non-refundable once document screening begins.',
    'Withdrawal prior to semester start: 100% tuition refund less KRW 60,000 administrative charge.\n• 1 to 30 days after class start: 80% refund.\n• 31 to 60 days after class start: 50% refund.\n• After 60 days: Non-refundable.',
    '100% tuition refund upon submitting Korean diplomatic mission visa refusal confirmation letter prior to class commencement.',
    'Submit signed Tuition Refund Application form to Underwood International College Administration Office 10 days before term start.',
    '14 business days via international wire.',
    'Verified',
    verifiedDate,
    verifier,
    now
  );

  insertRefund.run(
    'UNI-KOREA',
    0,
    'Application fee of KRW 150,000 is non-refundable once the applicant registration number is generated.',
    'Withdrawal before first day of classes: 100% refund minus wire commission.\n• Within 30 days: 5/6 refund.\n• 31 to 60 days: 2/3 refund.\n• 61 to 90 days: 1/2 refund.\n• Beyond 90 days: Zero refund.',
    'Full refund upon presentation of original Embassy denial stamped passport or electronic rejection verification code.',
    'Formal written notification at least 7 days before international student orientation week.',
    '15 business days.',
    'Verified',
    verifiedDate,
    verifier,
    now
  );

  insertRefund.run(
    'UNI-KAIST',
    0,
    'USD 80 application fee is non-refundable under all circumstances.',
    'Admitted international students receive a 100% tuition waiver scholarship. Matriculation acceptance security deposit ($300 USD) is fully refunded into student living allowance account after registration or upon visa denial.',
    'Full deposit refund upon presenting official Korean Embassy rejection letter.',
    'Notice of withdrawal must be filed within 14 days of acceptance deadline.',
    '10 to 14 business days.',
    'Verified',
    verifiedDate,
    verifier,
    now
  );

  insertRefund.run(
    'UNI-SKKU',
    0,
    'Application fee of KRW 100,000 is non-refundable after online application submission.',
    'Prior to opening day: 100% refund minus KRW 50,000 bank charges.\n• Up to 30 days: 5/6 refund.\n• 31 to 60 days: 2/3 refund.\n• 61 to 90 days: 1/2 refund.\n• After 90 days: 0%.',
    '100% tuition refunded upon submission of Korean diplomatic mission refusal receipt.',
    'Formal cancellation request through SKKU International Office before class commencement.',
    '14 to 21 business days.',
    'Verified',
    verifiedDate,
    verifier,
    now
  );

  // 5. Seed Bank Accounts
  const insertBank = db.prepare(`
    INSERT OR REPLACE INTO university_bank_accounts (
      id, university_id, account_holder, bank_name, branch_name, account_number,
      swift_code, currency, payment_instructions, is_virtual_account_supported,
      verification_status, last_verified_at, verified_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBank.run(
    'BNK-SNU-01',
    'UNI-SNU',
    'Seoul National University',
    'Kookmin Bank',
    'Seoul National University Campus Branch',
    '123-456-7890',
    'CZNBKRSE',
    'KRW',
    '1. Remit in Korean Won (KRW) or exact USD equivalent using KB Kookmin Bank telegraphic transfer selling rate.\n2. In the remittance remark/memo, strictly write applicant SNU Application Number and Full Name.\n3. Wire fee mode MUST be set to "OUR" (all correspondent and receiving bank charges paid by sender).\n4. Email remittance SWIFT MT103 telegraphic confirmation receipt to admissions@snu.ac.kr within 24 hours of transfer.',
    1,
    'Verified',
    verifiedDate,
    verifier,
    now
  );

  insertBank.run(
    'BNK-YON-01',
    'UNI-YONSEI',
    'Yonsei University (연세대학교)',
    'Woori Bank (우리은행)',
    'Yonsei Sinchon Campus Branch (연세대지점)',
    '1002-941-002891 (Woori Virtual Account)',
    'HVBCKRSE',
    'KRW',
    '1. Each admitted applicant is assigned a unique Woori Bank 14-digit virtual account upon admission offer.\n2. Payment must be transferred strictly into the individual virtual account.\n3. Third-party deposits are permitted provided student ID is indicated.\n4. Sender must choose OUR charging mode for international wires.',
    1,
    'Verified',
    verifiedDate,
    verifier,
    now
  );

  insertBank.run(
    'BNK-KU-01',
    'UNI-KOREA',
    'Korea University (고려대학교)',
    'Hana Bank (하나은행 - formerly KEB Hana)',
    'Korea University Anam Branch (고려대안암지점)',
    '391-910008-41005',
    'KOEXKRSE',
    'KRW',
    '1. Deposit strictly in KRW.\n2. Wire memo format: "KU-APPNO-STUDENTNAME".\n3. Proof of telegraphic transfer receipt must be uploaded to the KU Admissions Portal under "Tuition Receipt Verification".',
    1,
    'Verified',
    verifiedDate,
    verifier,
    now
  );

  insertBank.run(
    'BNK-KAIST-01',
    'UNI-KAIST',
    'KAIST (Korea Advanced Institute of Science and Technology)',
    'Woori Bank (우리은행)',
    'KAIST Daedeok Campus Branch (KAIST대덕지점)',
    '1005-301-449102',
    'HVBCKRSE',
    'USD',
    '1. Application fee ($80 USD) and deposit can be wired in USD to Woori Bank.\n2. Intermediary SWIFT correspondent for USD wire: Woori Bank New York Agency (HVBCUS33).\n3. Remittance memo must state: "KAIST-REG-NO-APPLICANT-NAME".',
    0,
    'Verified',
    verifiedDate,
    verifier,
    now
  );

  insertBank.run(
    'BNK-SKKU-01',
    'UNI-SKKU',
    'Sungkyunkwan University (성균관대학교)',
    'KB Kookmin Bank (국민은행)',
    'SKKU Myeongnyun Branch (성균관대명륜지점)',
    '803-01-0294-819',
    'CZNBKRSE',
    'KRW',
    '1. Remit in KRW to KB Kookmin Bank.\n2. Ensure tuition invoice number is quoted on bank deposit slip.\n3. Keep wire transfer transaction voucher for Embassy visa interview.',
    1,
    'Verified',
    verifiedDate,
    verifier,
    now
  );

  // 6. Seed Documents
  const insertDoc = db.prepare(`
    INSERT OR REPLACE INTO university_documents (
      id, university_id, title, category, file_url, file_size, file_format,
      intake_term, verification_status, uploaded_at, uploaded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Verified', ?, ?)
  `);

  insertDoc.run('DOC-SNU-01', 'UNI-SNU', 'Admission Guide (PDF)', 'Admission Guidelines', 'https://en.snu.ac.kr/admission/undergraduate/application', '2.5 MB', 'PDF', 'Spring 2027', verifiedDate, verifier);
  insertDoc.run('DOC-SNU-02', 'UNI-SNU', 'Application Form (PDF)', 'Application Form', 'https://en.snu.ac.kr/admission/form', '1.8 MB', 'PDF', 'Spring 2027', verifiedDate, verifier);
  insertDoc.run('DOC-SNU-03', 'UNI-SNU', 'University Brochure (PDF)', 'Circular', 'https://en.snu.ac.kr/brochure', '3.2 MB', 'PDF', 'Spring 2027', verifiedDate, verifier);
  insertDoc.run('DOC-SNU-04', 'UNI-SNU', 'Ministry of Justice D-2 Student Visa Apostille Guidelines', 'Visa & Immigration', 'https://www.hikorea.go.kr', '1.2 MB', 'PDF', 'Spring 2027', verifiedDate, verifier);

  insertDoc.run('DOC-YON-01', 'UNI-YONSEI', 'Yonsei UIC Spring 2027 International Applicant Handbook', 'Admission Guidelines', 'https://uic.yonsei.ac.kr', '5.1 MB', 'PDF', 'Spring 2027', verifiedDate, verifier);
  insertDoc.run('DOC-YON-02', 'UNI-YONSEI', 'Yonsei KLI Regular Korean Course Circular & Housing Information', 'Circular', 'https://www.yskli.com', '2.1 MB', 'PDF', 'Spring 2027', verifiedDate, verifier);
  insertDoc.run('DOC-YON-03', 'UNI-YONSEI', 'Yonsei University Tuition Payment Guide & Woori Bank Wire Details', 'Tuition & Bank', 'https://www.yonsei.ac.kr/en_sc/admission', '750 KB', 'PDF', 'Spring 2027', verifiedDate, verifier);

  insertDoc.run('DOC-KU-01', 'UNI-KOREA', 'Korea University Spring 2027 Admissions Guide for International Students', 'Admission Guidelines', 'https://oia.korea.ac.kr', '4.8 MB', 'PDF', 'Spring 2027', verifiedDate, verifier);
  insertDoc.run('DOC-KU-02', 'UNI-KOREA', 'KU Korean Language Center Admissions Circular 2026-2027', 'Circular', 'https://klc.korea.ac.kr', '1.9 MB', 'PDF', 'Spring 2027', verifiedDate, verifier);
  insertDoc.run('DOC-KU-03', 'UNI-KOREA', 'Apostille & Consular Legalization Instructions for KU Applicants', 'Visa & Immigration', 'https://oia.korea.ac.kr/visa', '1.1 MB', 'PDF', 'Spring 2027', verifiedDate, verifier);

  insertDoc.run('DOC-KAIST-01', 'UNI-KAIST', 'KAIST Undergraduate Admissions Guide for International Students 2027', 'Admission Guidelines', 'https://admission.kaist.ac.kr/intl-undergraduate', '3.8 MB', 'PDF', 'Spring 2027', verifiedDate, verifier);
  insertDoc.run('DOC-KAIST-02', 'UNI-KAIST', 'KAIST International Student Full Scholarship Terms & Stipend Criteria', 'Tuition & Bank', 'https://admission.kaist.ac.kr/scholarship', '620 KB', 'PDF', 'Spring 2027', verifiedDate, verifier);
  insertDoc.run('DOC-KAIST-03', 'UNI-KAIST', 'KAIST Graduate School of AI Prospectus & Lab Research Guide', 'Circular', 'https://gsai.kaist.ac.kr', '2.9 MB', 'PDF', 'Spring 2027', verifiedDate, verifier);

  insertDoc.run('DOC-SKKU-01', 'UNI-SKKU', 'SKKU Spring 2027 International Student Admissions Circular', 'Admission Guidelines', 'https://admission-global.skku.edu', '4.4 MB', 'PDF', 'Spring 2027', verifiedDate, verifier);
  insertDoc.run('DOC-SKKU-02', 'UNI-SKKU', 'Sungkyun Language Institute (SLI) Course Schedule & Housing Guide', 'Circular', 'https://koreansli.skku.edu', '2.3 MB', 'PDF', 'Spring 2027', verifiedDate, verifier);
  insertDoc.run('DOC-SKKU-03', 'UNI-SKKU', 'SKKU Tuition & Scholarship Payment Notice for Admitted Students', 'Tuition & Bank', 'https://admission-global.skku.edu/tuition', '810 KB', 'PDF', 'Spring 2027', verifiedDate, verifier);
}

export function createBackupSnapshot(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.resolve(BACKUP_DIR, `consultancy_backup_${timestamp}.sqlite`);
  try {
    db.backup(backupFile);
    return backupFile;
  } catch (err) {
    console.error('Failed to create SQLite backup snapshot:', err);
    return '';
  }
}

export function ensureTeamMembersSeeded(): void {
  const now = new Date().toISOString();

  // Update existing users to their teams
  try {
    db.prepare(`UPDATE users SET team = 'Admission Team' WHERE id IN ('USR-ADMIN', 'USR-CONSULTANT-1', 'USR-CONSULTANT-2')`).run();
    db.prepare(`UPDATE users SET team = 'Counseling Team' WHERE id = 'USR-CONSULTANT-3'`).run();
  } catch {}

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, role, title, avatar, phone, team, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      role = excluded.role,
      title = excluded.title,
      avatar = excluded.avatar,
      phone = excluded.phone,
      team = excluded.team
  `);

  const admissionMembers = [
    {
      id: 'USR-ADMIN',
      name: 'Samiul Alam',
      email: 'samiul.wecare@gmail.com',
      role: 'Admission_Manager',
      title: 'Head of Admissions & Visa Processing',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-8291-4401',
      team: 'Admission Team',
    },
    {
      id: 'USR-CONSULTANT-1',
      name: 'Min-Ji Park',
      email: 'minji.park@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Senior Admission Officer & Evaluation Lead',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-3329-8812',
      team: 'Admission Team',
    },
    {
      id: 'USR-CONSULTANT-2',
      name: 'Hannah Lee',
      email: 'hannah.lee@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Visa Officer & Document Notarization Specialist',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-9901-2311',
      team: 'Admission Team',
    },
    {
      id: 'USR-ADM-04',
      name: 'Ji-Hoon Choi',
      email: 'jihoon.choi@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Apostille & Ministry Verification Coordinator',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-5512-9901',
      team: 'Admission Team',
    },
    {
      id: 'USR-ADM-05',
      name: 'So-Yeon Kang',
      email: 'soyeon.kang@wecare-consulting.kr',
      role: 'Consultant',
      title: 'University Liaison & Courier Logistics Officer',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-6644-1289',
      team: 'Admission Team',
    },
    {
      id: 'USR-ADM-06',
      name: 'Jun-Seok Bae',
      email: 'junseok.bae@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Embassy Visa Compliance & CoA Specialist',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-7788-3412',
      team: 'Admission Team',
    },
    {
      id: 'USR-ADM-07',
      name: 'Ye-Eun Jung',
      email: 'yeeun.jung@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Bank Financial Verification & Affidavit Officer',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-2211-9087',
      team: 'Admission Team',
    },
    {
      id: 'USR-ADM-08',
      name: 'Hyun-Woo Shin',
      email: 'hyunwoo.shin@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Korean Legal Translation Specialist',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-4499-6721',
      team: 'Admission Team',
    },
    {
      id: 'USR-ADM-09',
      name: 'Su-Bin Lim',
      email: 'subin.lim@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Intake Dossier Registrar & Portal Clerk',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-8833-2154',
      team: 'Admission Team',
    },
  ];

  const counselingMembers = [
    {
      id: 'USR-CONSULTANT-3',
      name: 'David Kim',
      email: 'david.kim@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Senior Korean Education Counselor & D-4 Advisor',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-4412-7789',
      team: 'Counseling Team',
    },
    {
      id: 'USR-CNS-02',
      name: 'Yu-Jin Song',
      email: 'yujin.song@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Undergraduate Admissions Advisor (SKY Track)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-3124-7890',
      team: 'Counseling Team',
    },
    {
      id: 'USR-CNS-03',
      name: 'Tae-Hyun Moon',
      email: 'taehyun.moon@wecare-consulting.kr',
      role: 'Consultant',
      title: 'STEM & Graduate Research Counselor (KAIST/POSTECH)',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-9087-6543',
      team: 'Counseling Team',
    },
    {
      id: 'USR-CNS-04',
      name: 'Bo-Ram Yoon',
      email: 'boram.yoon@wecare-consulting.kr',
      role: 'Consultant',
      title: 'GKS Government Scholarship & Financial Aid Specialist',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-1234-9876',
      team: 'Counseling Team',
    },
    {
      id: 'USR-CNS-05',
      name: 'Jin-Woo Park',
      email: 'jinwoo.park@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Arts, Design & Media Portfolio Pathway Advisor',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-4567-8901',
      team: 'Counseling Team',
    },
    {
      id: 'USR-CNS-06',
      name: 'Seo-Yeon Ahn',
      email: 'seoyeon.ahn@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Medical, Pharmacy & Bio-Health Sciences Advisor',
      avatar: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-5678-1234',
      team: 'Counseling Team',
    },
    {
      id: 'USR-CNS-07',
      name: 'Dong-Hyuk Cho',
      email: 'donghyuk.cho@wecare-consulting.kr',
      role: 'Consultant',
      title: 'English-Track Programs Counselor (Yonsei UIC Lead)',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-6789-2345',
      team: 'Counseling Team',
    },
    {
      id: 'USR-CNS-08',
      name: 'Eun-Bi Chae',
      email: 'eunbi.chae@wecare-consulting.kr',
      role: 'Consultant',
      title: 'High School Leavers & Foundation Track Counselor',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-7890-3456',
      team: 'Counseling Team',
    },
    {
      id: 'USR-CNS-09',
      name: 'Jae-Won Oh',
      email: 'jaewon.oh@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Regional Universities & Work-Study Programs Advisor',
      avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-8901-4567',
      team: 'Counseling Team',
    },
    {
      id: 'USR-CNS-10',
      name: 'Ha-Neul Jung',
      email: 'haneul.jung@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Student Experience & Pre-Departure Orientation Specialist',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-9012-5678',
      team: 'Counseling Team',
    },
    {
      id: 'USR-CNS-11',
      name: 'Sang-Min Ryu',
      email: 'sangmin.ryu@wecare-consulting.kr',
      role: 'Consultant',
      title: 'Direct Outreach & University Interview Coach',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
      phone: '+82-10-2345-6789',
      team: 'Counseling Team',
    },
  ];

  for (const m of [...admissionMembers, ...counselingMembers]) {
    insertUser.run(m.id, m.name, m.email, m.role, m.title, m.avatar, m.phone, m.team, now);
  }
}

export function seedTeamTasksIfEmpty(): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
  if (count.count > 4) return;

  const now = new Date();
  const nowIso = now.toISOString();
  const formatOffsetDate = (offsetDays: number) => {
    const d = new Date(now.getTime() + offsetDays * 86400000);
    return d.toISOString().slice(0, 10);
  };

  const todayStr = formatOffsetDate(0);
  const tomorrowStr = formatOffsetDate(1);
  const yesterdayStr = formatOffsetDate(-1);
  const twoDaysAgoStr = formatOffsetDate(-2);
  const threeDaysAgoStr = formatOffsetDate(-3);
  const fiveDaysAgoStr = formatOffsetDate(-5);
  const threeDaysAheadStr = formatOffsetDate(3);
  const fiveDaysAheadStr = formatOffsetDate(5);

  const insertTask = db.prepare(`
    INSERT OR REPLACE INTO tasks (
      id, title, description, category, priority, task_date, deadline,
      scheduled_time, status, created_at, completed_at, notes, last_updated,
      sync_state, sheet_row_number, project_id, student_id, university_id,
      assigned_to_id, assigned_by_id, subtasks_json, team
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', NULL, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialTasks = [
    // ADMISSION TEAM TASKS
    {
      id: 'TSK-ADM-101',
      title: 'Audit Apostille Verification for SNU Spring 2027 Cohort',
      description: 'Check Korean MOFA and consular seal authenticity for Kim Min-jun high school diploma dossier.',
      category: 'Work',
      priority: 'Urgent',
      task_date: todayStr,
      deadline: todayStr,
      scheduled_time: '10:00',
      status: 'Pending',
      created_at: nowIso,
      completed_at: null,
      notes: 'Ensure apostille registration matches electronic portal number before embassy verification.',
      project_id: 'PRJ-SNU-2027S',
      student_id: 'STU-2027-001',
      university_id: 'UNI-SNU',
      assigned_to_id: 'USR-CONSULTANT-1',
      assigned_by_id: 'USR-ADMIN',
      team: 'Admission Team',
      subtasks: [
        { id: 'st1', title: 'Verify electronic notary stamp', completed: true },
        { id: 'st2', title: 'Cross-check graduation transcript apostille', completed: true },
        { id: 'st3', title: 'Upload notarized PDF copy to portal', completed: false },
      ],
    },
    {
      id: 'TSK-ADM-102',
      title: 'Dispatch Yonsei UIC Hardcopy Transcripts via DHL Express',
      description: 'Assemble original certified transcripts and family relation certificates for immediate DHL pickup.',
      category: 'Business',
      priority: 'High',
      task_date: todayStr,
      deadline: todayStr,
      scheduled_time: '14:30',
      status: 'Pending',
      created_at: nowIso,
      completed_at: null,
      notes: 'Tracking number DHL-4482-1092-KR will be confirmed by courier pickup officer.',
      project_id: 'PRJ-YONSEI-2027S',
      student_id: 'STU-2027-002',
      university_id: 'UNI-YONSEI',
      assigned_to_id: 'USR-CONSULTANT-2',
      assigned_by_id: 'USR-ADMIN',
      team: 'Admission Team',
      subtasks: [
        { id: 'st1', title: 'Verify envelope seal and wax stamp', completed: true },
        { id: 'st2', title: 'Print DHL International Air Waybill', completed: false },
      ],
    },
    {
      id: 'TSK-ADM-103',
      title: 'Bank Balance Affidavit Compliance Check ($20,000 USD)',
      description: 'Audit 30-day validity window of candidate bank certificates for Korea University applicants.',
      category: 'Work',
      priority: 'High',
      task_date: tomorrowStr,
      deadline: threeDaysAheadStr,
      scheduled_time: '11:15',
      status: 'Pending',
      created_at: nowIso,
      completed_at: null,
      notes: 'Must verify bank certificate was issued after October 10th.',
      project_id: 'PRJ-KOREA-2027S',
      student_id: 'STU-2027-003',
      university_id: 'UNI-KOREA',
      assigned_to_id: 'USR-ADM-07',
      assigned_by_id: 'USR-ADMIN',
      team: 'Admission Team',
      subtasks: [],
    },
    {
      id: 'TSK-ADM-104',
      title: 'Translate & Legalize Vietnamese Academic Records to Korean',
      description: 'Coordinate certified sworn Korean translation for Tran Van Minh secondary credentials.',
      category: 'Work',
      priority: 'Medium',
      task_date: yesterdayStr,
      deadline: yesterdayStr,
      scheduled_time: '16:00',
      status: 'Pending', // OVERDUE
      created_at: fiveDaysAgoStr,
      completed_at: null,
      notes: 'Awaiting certified translator final seal from Seoul District Court registry.',
      project_id: 'PRJ-KOREA-2027S',
      student_id: 'STU-2027-003',
      university_id: 'UNI-KOREA',
      assigned_to_id: 'USR-ADM-08',
      assigned_by_id: 'USR-ADMIN',
      team: 'Admission Team',
      subtasks: [
        { id: 'st1', title: 'Complete first draft translation', completed: true },
        { id: 'st2', title: 'Notary verification at Seoul Court', completed: false },
      ],
    },
    {
      id: 'TSK-ADM-105',
      title: 'Register Certificate of Admission (CoA) on HiKorea Immigration Portal',
      description: 'Upload Certificate of Admission for Kim Min-jun and confirm visa clearance eligibility.',
      category: 'Work',
      priority: 'Urgent',
      task_date: twoDaysAgoStr,
      deadline: twoDaysAgoStr,
      scheduled_time: '09:30',
      status: 'Completed',
      created_at: fiveDaysAgoStr,
      completed_at: yesterdayStr + 'T15:20:00.000Z',
      notes: 'CoA successfully registered: COA-2027-SNU-0841. Receipt verified by Min-Ji Park.',
      project_id: 'PRJ-SNU-2027S',
      student_id: 'STU-2027-001',
      university_id: 'UNI-SNU',
      assigned_to_id: 'USR-ADM-06',
      assigned_by_id: 'USR-ADMIN',
      team: 'Admission Team',
      subtasks: [
        { id: 'st1', title: 'Acquire official university CoA scan', completed: true },
        { id: 'st2', title: 'Submit to HiKorea e-application system', completed: true },
      ],
    },
    {
      id: 'TSK-ADM-106',
      title: 'Upload Electronic Intake Dossier to Sungkyunkwan Portal',
      description: 'Batch upload validated dossiers before the international early decision deadline.',
      category: 'Work',
      priority: 'Medium',
      task_date: threeDaysAheadStr,
      deadline: fiveDaysAheadStr,
      scheduled_time: '13:00',
      status: 'Pending',
      created_at: nowIso,
      completed_at: null,
      notes: 'SKKU online admissions system requires individual document PDF sizes under 5MB.',
      project_id: null,
      student_id: null,
      university_id: 'UNI-SKKU',
      assigned_to_id: 'USR-ADM-09',
      assigned_by_id: 'USR-ADMIN',
      team: 'Admission Team',
      subtasks: [],
    },
    {
      id: 'TSK-ADM-107',
      title: 'Review Korean Ministry of Justice D-2 Visa Regulation Updates',
      description: 'Brief all admission officers on modified bank statement validity and apostille waivers.',
      category: 'Study',
      priority: 'Medium',
      task_date: threeDaysAgoStr,
      deadline: threeDaysAgoStr,
      scheduled_time: '15:00',
      status: 'Completed',
      created_at: fiveDaysAgoStr,
      completed_at: twoDaysAgoStr + 'T17:00:00.000Z',
      notes: 'Shared regulatory memo with Admission and Counseling teams.',
      project_id: null,
      student_id: null,
      university_id: null,
      assigned_to_id: 'USR-ADMIN',
      assigned_by_id: 'USR-ADMIN',
      team: 'Admission Team',
      subtasks: [],
    },

    // COUNSELING TEAM TASKS
    {
      id: 'TSK-CNS-201',
      title: 'Underwood International College (UIC) Video Interview Coaching Call',
      description: 'Host 45-minute mock admission interview with candidate Amina Rahman for Yonsei UIC B.A.',
      category: 'Work',
      priority: 'High',
      task_date: todayStr,
      deadline: todayStr,
      scheduled_time: '15:30',
      status: 'Pending',
      created_at: nowIso,
      completed_at: null,
      notes: 'Focus on global affairs personal essay, current Asian geopolitical context, and extracurricular leadership.',
      project_id: 'PRJ-YONSEI-2027S',
      student_id: 'STU-2027-002',
      university_id: 'UNI-YONSEI',
      assigned_to_id: 'USR-CNS-07',
      assigned_by_id: 'USR-ADMIN',
      team: 'Counseling Team',
      subtasks: [
        { id: 'st1', title: 'Prepare past UIC interview questions', completed: true },
        { id: 'st2', title: 'Conduct live Zoom mock session', completed: false },
        { id: 'st3', title: 'Provide written feedback score sheet', completed: false },
      ],
    },
    {
      id: 'TSK-CNS-202',
      title: 'Review Korean Language Intensive (D-4) Study Plan for Tran Van Minh',
      description: 'Refine 12-month study progression plan from TOPIK Level 1 to Level 4 for embassy filing.',
      category: 'Work',
      priority: 'Medium',
      task_date: todayStr,
      deadline: tomorrowStr,
      scheduled_time: '11:00',
      status: 'Pending',
      created_at: nowIso,
      completed_at: null,
      notes: 'Ensure financial guarantee letter matches semester tuition progression.',
      project_id: 'PRJ-KOREA-2027S',
      student_id: 'STU-2027-003',
      university_id: 'UNI-KOREA',
      assigned_to_id: 'USR-CONSULTANT-3',
      assigned_by_id: 'USR-ADMIN',
      team: 'Counseling Team',
      subtasks: [],
    },
    {
      id: 'TSK-CNS-203',
      title: 'KAIST STEM Research Prospectus & Professor Advisor Matching',
      description: 'Assist graduate applicant with laboratory research statement alignment for AI department.',
      category: 'Work',
      priority: 'High',
      task_date: yesterdayStr,
      deadline: yesterdayStr,
      scheduled_time: '14:00',
      status: 'Pending', // OVERDUE
      created_at: fiveDaysAgoStr,
      completed_at: null,
      notes: 'Candidate needs updated publication list and GitHub portfolio link in statement.',
      project_id: null,
      student_id: null,
      university_id: 'UNI-KAIST',
      assigned_to_id: 'USR-CNS-03',
      assigned_by_id: 'USR-ADMIN',
      team: 'Counseling Team',
      subtasks: [
        { id: 'st1', title: 'Review prospective professor CV and papers', completed: true },
        { id: 'st2', title: 'Draft contact email and project synopsis', completed: false },
      ],
    },
    {
      id: 'TSK-CNS-204',
      title: 'GKS 2027 Government Scholarship Eligibility Counseling',
      description: 'Evaluate GPA, language qualifications, and community service record for 3 undergraduate hopefuls.',
      category: 'Work',
      priority: 'Medium',
      task_date: threeDaysAheadStr,
      deadline: fiveDaysAheadStr,
      scheduled_time: '16:00',
      status: 'Pending',
      created_at: nowIso,
      completed_at: null,
      notes: 'GKS Embassy Track guidelines require strict Top 20% percentile class ranking.',
      project_id: null,
      student_id: null,
      university_id: null,
      assigned_to_id: 'USR-CNS-04',
      assigned_by_id: 'USR-ADMIN',
      team: 'Counseling Team',
      subtasks: [],
    },
    {
      id: 'TSK-CNS-205',
      title: 'Hold Pre-Departure Orientation on Korean Dormitory & Alien Registration',
      description: 'Host introductory webinar explaining ARC registration, health insurance, and SIM cards in Seoul.',
      category: 'Business',
      priority: 'Low',
      task_date: twoDaysAgoStr,
      deadline: twoDaysAgoStr,
      scheduled_time: '19:00',
      status: 'Completed',
      created_at: fiveDaysAgoStr,
      completed_at: yesterdayStr + 'T20:30:00.000Z',
      notes: '42 admitted students attended live session. Presentation slide deck emailed to all.',
      project_id: null,
      student_id: null,
      university_id: null,
      assigned_to_id: 'USR-CNS-10',
      assigned_by_id: 'USR-ADMIN',
      team: 'Counseling Team',
      subtasks: [],
    },
    {
      id: 'TSK-CNS-206',
      title: 'Arts & Media Portfolio Review for SNU Design Department',
      description: 'Curate 15-piece visual arts portfolio and ensure bilingual captioning compliance.',
      category: 'Work',
      priority: 'High',
      task_date: formatOffsetDate(2),
      deadline: formatOffsetDate(4),
      scheduled_time: '13:30',
      status: 'Pending',
      created_at: nowIso,
      completed_at: null,
      notes: 'SNU Fine Arts requires digital portfolio on USB flash drive and physical sketchbook.',
      project_id: 'PRJ-SNU-2027S',
      student_id: null,
      university_id: 'UNI-SNU',
      assigned_to_id: 'USR-CNS-05',
      assigned_by_id: 'USR-ADMIN',
      team: 'Counseling Team',
      subtasks: [],
    },
    {
      id: 'TSK-CNS-207',
      title: 'Undergraduate SKY Track Strategy Session with Parent & Candidate',
      description: 'Comprehensive 1-on-1 strategy meeting evaluating SNU, Yonsei, and Korea University admissions probabilities.',
      category: 'Business',
      priority: 'Urgent',
      task_date: todayStr,
      deadline: todayStr,
      scheduled_time: '17:00',
      status: 'Pending',
      created_at: nowIso,
      completed_at: null,
      notes: 'Review TOPIK 5 score report and mock GPA recalculation on Korean 4.5 grading scale.',
      project_id: null,
      student_id: null,
      university_id: 'UNI-SNU',
      assigned_to_id: 'USR-CNS-02',
      assigned_by_id: 'USR-ADMIN',
      team: 'Counseling Team',
      subtasks: [],
    },
  ];

  for (const t of initialTasks) {
    insertTask.run(
      t.id,
      t.title,
      t.description,
      t.category,
      t.priority,
      t.task_date,
      t.deadline,
      t.scheduled_time,
      t.status,
      t.created_at,
      t.completed_at,
      t.notes,
      nowIso,
      t.project_id,
      t.student_id,
      t.university_id,
      t.assigned_to_id,
      t.assigned_by_id,
      JSON.stringify(t.subtasks),
      t.team
    );
  }
}

