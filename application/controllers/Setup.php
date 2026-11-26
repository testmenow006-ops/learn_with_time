<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Setup extends CI_Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->load->database();
    }

    public function install()
    {
        if (!$this->input->is_cli_request()) show_404();

        $schema = file_get_contents(FCPATH . 'migrations/001_initial.sql');
        if ($schema === FALSE) show_error('Could not read the initial database migration.', 500);
        foreach (explode(';', $schema) as $statement) {
            $statement = trim($statement);
            if ($statement !== '') $this->db->query($statement);
        }
        $this->db->query(
            "CREATE TABLE IF NOT EXISTS auth_attempts (
                id BIGSERIAL PRIMARY KEY,
                ip_address TEXT NOT NULL,
                attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
             )"
        );
        $this->db->query('CREATE INDEX IF NOT EXISTS auth_attempts_ip_time_idx ON auth_attempts(ip_address, attempted_at)');
        $this->db->query(
            "CREATE TABLE IF NOT EXISTS ci_sessions (
                id VARCHAR(128) PRIMARY KEY,
                ip_address VARCHAR(45) NOT NULL,
                timestamp INTEGER NOT NULL DEFAULT 0,
                data TEXT NOT NULL
             )"
        );
        $this->db->query('CREATE INDEX IF NOT EXISTS ci_sessions_timestamp_idx ON ci_sessions(timestamp)');
        $this->seed();
        echo "CodeIgniter 3 database schema and seed data are ready.\n";
    }

    private function seed()
    {
        $email = strtolower(getenv('ADMIN_EMAIL') ?: 'teacher@example.com');
        $password = getenv('ADMIN_PASSWORD') ?: 'ChangeMe123!';
        $user = $this->db->query('SELECT id FROM users WHERE email = ?', array($email))->row_array();
        if (!$user) {
            $user = $this->db->query(
                "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin') RETURNING id",
                array($email, password_hash($password, PASSWORD_BCRYPT, array('cost' => 12)))
            )->row_array();
        }
        $userId = (int) $user['id'];
        $this->db->query(
            "INSERT INTO teacher_profiles
             (user_id, name, designation, introduction, biography, location, email, phone, profile_image, cover_image, social_links)
             VALUES (?, 'Alex Morgan', 'Educator & lifelong learner',
             'Helping curious minds find confidence, ask better questions, and enjoy the process of learning.',
             'I believe great teaching begins with listening. For over a decade, I have helped students build the skills and confidence to take their learning further.',
             'Portland, Oregon', ?, '+1 (503) 555-0142',
             'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=960&q=85',
             'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1800&q=85',
             '{\"LinkedIn\":\"https://linkedin.com\",\"Instagram\":\"https://instagram.com\"}')
             ON CONFLICT (user_id) DO NOTHING",
            array($userId, $email)
        );

        $design = array(
            'primary' => '#426b59', 'accent' => '#d9a77d', 'background' => '#f6f7f4',
            'font' => 'DM Sans', 'radius' => '18px', 'layout' => 'comfortable',
        );
        $sections = array(
            array('key' => 'about', 'label' => 'About me', 'enabled' => TRUE),
            array('key' => 'qualifications', 'label' => 'Education', 'enabled' => TRUE),
            array('key' => 'experience', 'label' => 'Experience', 'enabled' => TRUE),
            array('key' => 'subjects', 'label' => 'Subjects', 'enabled' => TRUE),
            array('key' => 'skills', 'label' => 'Expertise', 'enabled' => TRUE),
            array('key' => 'achievements', 'label' => 'Achievements', 'enabled' => TRUE),
            array('key' => 'testimonials', 'label' => 'Kind words', 'enabled' => TRUE),
            array('key' => 'gallery', 'label' => 'Little moments', 'enabled' => TRUE),
            array('key' => 'announcements', 'label' => 'Latest updates', 'enabled' => TRUE),
            array('key' => 'contact', 'label' => 'Get in touch', 'enabled' => TRUE),
        );
        $this->db->query(
            'INSERT INTO site_settings (user_id, draft_design, published_design, draft_sections, published_sections)
             VALUES (?, ?::jsonb, ?::jsonb, ?::jsonb, ?::jsonb) ON CONFLICT (user_id) DO NOTHING',
            array($userId, json_encode($design), json_encode($design), json_encode($sections), json_encode($sections))
        );

        $count = $this->db->query('SELECT COUNT(*) AS count FROM contents WHERE user_id = ?', array($userId))->row_array();
        if ((int) $count['count'] === 0) {
            $category = $this->db->query(
                "INSERT INTO categories (user_id, name, slug) VALUES (?, 'Learning resources', 'learning-resources') RETURNING id",
                array($userId)
            )->row_array();
            $items = array(
                array('Small habits, big learning', 'small-habits-big-learning', 'article',
                    'A few classroom routines that help students become more independent learners.',
                    'Learning grows through small, consistent steps. Try a two-minute reflection at the end of each lesson: what surprised you, what is still unclear, and what will you try next?',
                    array('teaching', 'learning'), 'Small habits for lifelong learning', '2 days'),
                array('A guide to thoughtful note-taking', 'thoughtful-note-taking', 'material',
                    'A printable one-page guide to making notes that work for you.',
                    'Notice the main idea. Write it in your own words. Add one question and one connection. Review your notes briefly the next day.',
                    array('study skills', 'notes'), 'Thoughtful note-taking guide', '5 days'),
                array('Welcome to my learning space', 'welcome-learning-space', 'announcement',
                    'A little note about what you will find here.',
                    'I am glad you are here. This is a place for practical resources, teaching reflections, and ideas to support your next learning adventure.',
                    array('welcome'), 'Welcome to my learning space', '1 day'),
            );
            foreach ($items as $item) {
                $this->db->query(
                    "INSERT INTO contents (user_id, category_id, title, slug, type, excerpt, body, tags, status, published_at, seo_title)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?::text[], 'published', NOW() - ?::interval, ?)",
                    array($userId, (int) $category['id'], $item[0], $item[1], $item[2], $item[3], $item[4],
                        $this->pg_array($item[5]), $item[7], $item[6])
                );
            }
        }
        $this->seed_profile($userId);
        $this->snapshot($userId);
    }

    private function pg_array($items)
    {
        return '{' . implode(',', array_map(function ($item) {
            return '"' . str_replace(array('\\', '"'), array('\\\\', '\\"'), (string) $item) . '"';
        }, $items)) . '}';
    }

    private function seed_profile($userId)
    {
        $count = $this->db->query('SELECT COUNT(*) AS count FROM qualifications WHERE user_id=?', array($userId))->row_array();
        if ((int) $count['count'] !== 0) return;
        $this->db->query(
            "INSERT INTO qualifications (user_id, degree, institution, year) VALUES
             (?, 'M.Ed. Curriculum & Instruction', 'Northwest State University', '2015'),
             (?, 'B.A. English Education', 'Portland University', '2011')",
            array($userId, $userId)
        );
        $this->db->query(
            "INSERT INTO experiences (user_id, role, organization, period, description)
             VALUES (?, 'Lead Educator', 'Cedar Grove Academy', '2018 — Present',
             'Designing welcoming, inquiry-led learning experiences for middle school students.')",
            array($userId)
        );
        foreach (array('English Language Arts', 'Creative Writing', 'Study Skills') as $name) {
            $this->db->query('INSERT INTO subjects (user_id, name) VALUES (?, ?)', array($userId, $name));
        }
        foreach (array('Project-based learning', 'Differentiated instruction', 'Student mentorship') as $name) {
            $this->db->query('INSERT INTO skills (user_id, name) VALUES (?, ?)', array($userId, $name));
        }
        $this->db->query(
            "INSERT INTO achievements (user_id, title, organization, year)
             VALUES (?, 'Excellence in Teaching', 'Oregon Educators Association', '2023')",
            array($userId)
        );
        $this->db->query(
            "INSERT INTO testimonials (user_id, quote, author, detail)
             VALUES (?, 'You made me feel like my ideas mattered. I am not afraid to try anymore.', 'Jordan R.', 'Former student')",
            array($userId)
        );
    }

    private function snapshot($userId)
    {
        $profile = $this->db->query(
            'SELECT name, designation, introduction, biography, location, email, phone, profile_image, cover_image, social_links
             FROM teacher_profiles WHERE user_id=?',
            array($userId)
        )->row_array();
        $profile['social_links'] = json_decode($profile['social_links'], TRUE) ?: array();
        $snapshot = array('profile' => $profile);
        foreach (array('qualifications', 'experiences', 'subjects', 'skills', 'achievements', 'testimonials') as $table) {
            $columns = array(
                'qualifications' => 'degree, institution, year',
                'experiences' => 'role, organization, period, description',
                'subjects' => 'name', 'skills' => 'name',
                'achievements' => 'title, organization, year',
                'testimonials' => 'quote, author, detail',
            );
            $snapshot[$table] = $this->db->query(
                'SELECT ' . $columns[$table] . ' FROM ' . $table . ' WHERE user_id=? ORDER BY id',
                array($userId)
            )->result_array();
        }
        $encoded = json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $this->db->query(
            'UPDATE site_settings SET draft_portfolio=COALESCE(draft_portfolio, ?::jsonb),
             published_portfolio=COALESCE(published_portfolio, ?::jsonb) WHERE user_id=?',
            array($encoded, $encoded, $userId)
        );
    }
}
