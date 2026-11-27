<?php
defined('BASEPATH') OR exit('No direct script access allowed');

#[\AllowDynamicProperties]
class Api extends CI_Controller
{
    private $templates = array('modern', 'academic', 'creative', 'minimal', 'premium');
    private $sectionDefaults = array(
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
    private $designDefaults = array(
        'primary' => '#426b59',
        'accent' => '#d9a77d',
        'background' => '#f6f7f4',
        'font' => 'DM Sans',
        'radius' => '18px',
        'layout' => 'comfortable',
    );

    public function __construct()
    {
        parent::__construct();

        $origin = isset($_SERVER['HTTP_ORIGIN']) ? trim($_SERVER['HTTP_ORIGIN']) : '';
        if ($origin !== '') {
            $host = parse_url($origin, PHP_URL_HOST);
            $isLocal = in_array($host, array('localhost', '127.0.0.1', '::1'), TRUE);
            $isConfiguredOrigin = $origin === rtrim($this->config->item('base_url'), '/');

            if ($isLocal || $isConfiguredOrigin) {
                header('Access-Control-Allow-Origin: ' . $origin);
                header('Access-Control-Allow-Credentials: true');
                header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
                header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization, X-Requested-With');
                header('Vary: Origin');
            }
        }

        if ($this->input->method(TRUE) === 'OPTIONS') {
            header('Content-Length: 0');
            http_response_code(204);
            exit;
        }

        $this->load->model('Portfolio_model', 'portfolio');
    }

    private function json($data, $status = 200)
    {
        return $this->output
            ->set_status_header($status)
            ->set_content_type('application/json', 'utf-8')
            ->set_output(json_encode($data, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE));
    }

    private function fail($message, $status = 400)
    {
        return $this->json(array('error' => $message), $status);
    }

    private function database_error()
    {
        $error = $this->db->error();
        log_message('error', 'API database operation failed: ' . ($error['message'] ?? 'Unknown database error'));
        return $this->fail('Something went wrong. Please try again.', 500);
    }

    private function request_data()
    {
        $raw = $this->input->raw_input_stream;
        if ($raw !== '') {
            $data = json_decode($raw, TRUE);
            return is_array($data) ? $data : array();
        }
        return is_array($_POST) ? $_POST : array();
    }

    private function auth_user()
    {
        $userId = $this->session->userdata('user_id');
        $role = $this->session->userdata('role');
        return $userId && in_array($role, array('teacher', 'admin'), TRUE) ? (int) $userId : FALSE;
    }

    private function require_auth()
    {
        $userId = $this->auth_user();
        if (!$userId) {
            $this->fail('Please sign in to continue.', 401);
            return FALSE;
        }
        return $userId;
    }

    private function record($userId, $event, $path = '/')
    {
        return $this->db->query(
            'INSERT INTO analytics (user_id, event, ip_address, path) VALUES (?, ?, ?, ?)',
            array($userId, $event, $this->input->ip_address(), $path)
        ) !== FALSE;
    }

    private function record_visitor($userId, $location = array())
    {
        $ip = $this->input->ip_address();
        if (!$ip) $ip = 'unknown';

        $country = isset($location['country']) && is_string($location['country']) ? trim($location['country']) : '';
        $region = isset($location['region']) && is_string($location['region']) ? trim($location['region']) : '';
        $city = isset($location['city']) && is_string($location['city']) ? trim($location['city']) : '';
        $latitude = isset($location['latitude']) && is_numeric($location['latitude']) ? (float) $location['latitude'] : NULL;
        $longitude = isset($location['longitude']) && is_numeric($location['longitude']) ? (float) $location['longitude'] : NULL;
        $accuracy = isset($location['accuracy']) && is_numeric($location['accuracy']) ? (float) $location['accuracy'] : NULL;

        foreach (array('country' => 100, 'region' => 100, 'city' => 100) as $key => $max) {
            $value = $$key;
            if (strlen($value) > $max) return FALSE;
        }

        $sql = "INSERT INTO visitor_analytics
                    (user_id, ip_address, country, region, city, latitude, longitude, accuracy, visit_count, first_seen, last_seen)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    country = CASE WHEN VALUES(country) <> '' THEN VALUES(country) ELSE country END,
                    region = CASE WHEN VALUES(region) <> '' THEN VALUES(region) ELSE region END,
                    city = CASE WHEN VALUES(city) <> '' THEN VALUES(city) ELSE city END,
                    latitude = COALESCE(VALUES(latitude), latitude),
                    longitude = COALESCE(VALUES(longitude), longitude),
                    accuracy = COALESCE(VALUES(accuracy), accuracy),
                    visit_count = visit_count + 1,
                    last_seen = NOW()";

        return $this->db->query($sql, array($userId, $ip, $country, $region, $city, $latitude, $longitude, $accuracy)) !== FALSE;
    }

    private function text_ok($value, $min, $max, $trim = FALSE)
    {
        if (!is_string($value)) {
            return FALSE;
        }
        if ($trim) {
            $value = trim($value);
        }
        $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
        return $length >= $min && $length <= $max;
    }

    private function is_list_array($value)
    {
        if (!is_array($value)) {
            return FALSE;
        }
        return !$value || array_keys($value) === range(0, count($value) - 1);
    }

    private function validation_error($errors)
    {
        return implode('; ', $errors);
    }

    private function validate_content($input)
    {
        $errors = array();
        $types = array('article', 'material', 'video', 'announcement', 'achievement', 'resource');
        $statuses = array('draft', 'published', 'scheduled');
        if (!$this->text_ok($input['title'] ?? NULL, 1, 180, TRUE)) $errors[] = 'title: Required, up to 180 characters';
        if (!in_array($input['type'] ?? NULL, $types, TRUE)) $errors[] = 'type: Invalid content type';
        foreach (array('excerpt' => 600, 'body' => 50000, 'cover_image' => 1000, 'file_url' => 1000, 'video_url' => 1000, 'seo_title' => 180, 'seo_description' => 320) as $key => $max) {
            if (isset($input[$key]) && (!is_string($input[$key]) || strlen($input[$key]) > $max)) $errors[] = $key . ': Must be a string of at most ' . $max . ' characters';
        }
        if (!in_array($input['status'] ?? 'draft', $statuses, TRUE)) $errors[] = 'status: Invalid status';
        if (isset($input['category_id']) && $input['category_id'] !== NULL && (!filter_var($input['category_id'], FILTER_VALIDATE_INT) || (int) $input['category_id'] < 1)) $errors[] = 'category_id: Must be a positive integer or null';
        if (isset($input['tags']) && (!$this->is_list_array($input['tags']) || count($input['tags']) > 12)) {
            $errors[] = 'tags: Must contain at most 12 tags';
        } elseif (isset($input['tags'])) {
            foreach ($input['tags'] as $tag) {
                if (!$this->text_ok($tag, 1, 40, TRUE)) {
                    $errors[] = 'tags: Each tag must be 1 to 40 characters';
                    break;
                }
            }
        }
        if (($input['scheduled_at'] ?? NULL) !== NULL && (!is_string($input['scheduled_at']) || strtotime($input['scheduled_at']) === FALSE)) {
            $errors[] = 'scheduled_at: Must be a valid date and time or null';
        }
        if ($errors) return array(FALSE, $this->validation_error($errors));
        $input['title'] = trim($input['title']);
        foreach (array('excerpt', 'body', 'cover_image', 'file_url', 'video_url', 'seo_title', 'seo_description') as $key) {
            $input[$key] = $input[$key] ?? '';
        }
        $input['category_id'] = isset($input['category_id']) ? (int) $input['category_id'] : NULL;
        $input['tags'] = array_values($input['tags'] ?? array());
        $input['status'] = $input['status'] ?? 'draft';
        $input['scheduled_at'] = $input['scheduled_at'] ?? NULL;
        return array(TRUE, $input);
    }

    private function validate_profile($input)
    {
        $errors = array();
        $stringRules = array(
            'name' => array(1, 120), 'designation' => array(0, 180), 'introduction' => array(0, 1000),
            'biography' => array(0, 10000), 'location' => array(0, 180), 'phone' => array(0, 40),
            'profile_image' => array(0, 1000), 'cover_image' => array(0, 1000),
        );
        foreach ($stringRules as $key => $limits) {
            $value = $input[$key] ?? ($key === 'name' ? NULL : '');
            if (!$this->text_ok($value, $limits[0], $limits[1], $key === 'name')) $errors[] = $key . ': Invalid value';
        }
        $email = $input['email'] ?? '';
        if (!is_string($email) || strlen($email) > 254 || ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL))) $errors[] = 'email: Invalid email address';
        if (isset($input['social_links']) && !is_array($input['social_links'])) $errors[] = 'social_links: Must be an object';
        if (!isset($input['social_links']) || is_array($input['social_links'])) {
            foreach (($input['social_links'] ?? array()) as $key => $value) {
                if (!is_string($key) || !is_string($value) || strlen($value) > 500) $errors[] = 'social_links: Invalid social link';
            }
        }
        $collections = array(
            'qualifications' => array('degree' => array(1, 180), 'institution' => array(1, 180), 'year' => array(0, 30)),
            'experiences' => array('role' => array(1, 180), 'organization' => array(1, 180), 'period' => array(0, 80), 'description' => array(0, 1000)),
            'achievements' => array('title' => array(1, 180), 'organization' => array(0, 180), 'year' => array(0, 30)),
            'testimonials' => array('quote' => array(1, 1000), 'author' => array(1, 120), 'detail' => array(0, 180)),
        );
        foreach ($collections as $collection => $fields) {
            $rows = $input[$collection] ?? array();
            if (!$this->is_list_array($rows) || count($rows) > 30) {
                $errors[] = $collection . ': Invalid list';
                continue;
            }
            foreach ($rows as $index => $row) {
                if (!is_array($row)) {
                    $errors[] = $collection . '.' . $index . ': Invalid item';
                    continue;
                }
                foreach ($fields as $field => $limits) {
                    $value = $row[$field] ?? ($limits[0] === 0 ? '' : NULL);
                    if (!$this->text_ok($value, $limits[0], $limits[1], $limits[0] > 0)) $errors[] = $collection . '.' . $index . '.' . $field . ': Invalid value';
                }
            }
        }
        foreach (array('subjects', 'skills') as $collection) {
            $items = $input[$collection] ?? array();
            if (!$this->is_list_array($items) || count($items) > 30) {
                $errors[] = $collection . ': Invalid list';
                continue;
            }
            foreach ($items as $index => $item) {
                if (!$this->text_ok($item, 1, 80, TRUE)) $errors[] = $collection . '.' . $index . ': Invalid value';
            }
        }
        if ($errors) return array(FALSE, $this->validation_error($errors));

        foreach ($stringRules as $key => $_limits) {
            $input[$key] = $input[$key] ?? '';
        }
        $input['name'] = trim($input['name']);
        $input['email'] = $email;
        $input['social_links'] = $input['social_links'] ?? array();
        foreach (array('qualifications', 'experiences', 'achievements', 'testimonials', 'subjects', 'skills') as $collection) {
            $input[$collection] = $input[$collection] ?? array();
        }
        foreach (array('qualifications', 'experiences', 'achievements', 'testimonials') as $collection) {
            foreach ($input[$collection] as &$row) {
                foreach ($row as $key => $value) {
                    if (is_string($value)) $row[$key] = trim($value);
                }
            }
            unset($row);
        }
        foreach (array('subjects', 'skills') as $collection) {
            $input[$collection] = array_map('trim', $input[$collection]);
        }
        return array(TRUE, $input);
    }

    private function json_array($items)
    {
        return json_encode(array_values($items));
    }

    private function slugify($value)
    {
        $value = strtolower(iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value));
        $value = preg_replace('/[^a-z0-9]+/', '-', $value);
        return trim(substr($value, 0, 100), '-') ?: 'content';
    }

    public function health()
    {
        return $this->json(array('status' => 'ok'));
    }

    public function login()
    {
        if ($this->input->method(TRUE) !== 'POST') return $this->fail('Method not allowed.', 405);
        $ip = $this->input->ip_address();
        if ($this->db->query("DELETE FROM auth_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)") === FALSE) return $this->database_error();
        $count = $this->db->query(
            "SELECT COUNT(*) AS count FROM auth_attempts WHERE ip_address = ? AND attempted_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)",
            array($ip)
        )->row_array();
        if ((int) ($count['count'] ?? 0) >= 10) return $this->fail('Too many login attempts. Please try again later.', 429);

        $input = $this->request_data();
        $rawEmail = $input['email'] ?? NULL;
        if (!is_string($rawEmail)) return $this->fail('Enter a valid email address and password.');
        $email = strtolower(trim($rawEmail));
        $password = $input['password'] ?? '';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !is_string($password) || strlen($password) < 1 || strlen($password) > 200) {
            return $this->fail('Enter a valid email address and password.');
        }
        if ($this->db->query('INSERT INTO auth_attempts (ip_address, attempted_at) VALUES (?, NOW())', array($ip)) === FALSE) return $this->database_error();
        $user = $this->db->query('SELECT id, email, password_hash, role FROM users WHERE email = ?', array($email))->row_array();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            return $this->fail('Email or password is incorrect.', 401);
        }
        $this->session->sess_regenerate(TRUE);
        $this->session->set_userdata(array('user_id' => (int) $user['id'], 'role' => $user['role']));
        return $this->json(array('user' => array('email' => $user['email'])));
    }

    public function session_status()
    {
        return $this->json(array('authenticated' => (bool) $this->session->userdata('user_id')));
    }

    public function logout()
    {
        if (!$this->require_auth()) return;
        if ($this->input->method(TRUE) !== 'POST') return $this->fail('Method not allowed.', 405);
        $this->session->sess_destroy();
        return $this->json(array('success' => TRUE));
    }

    public function site()
    {
        $user = $this->portfolio->first_user();
        if (!$user) return $this->fail('Portfolio has not been configured.', 503);
        $userId = (int) $user['id'];
        if (!$this->record($userId, 'visit')) return $this->database_error();
        if (!$this->record_visitor($userId)) return $this->database_error();
        return $this->json($this->portfolio->site($userId));
    }

    public function public_content()
    {
        $user = $this->portfolio->first_user();
        if (!$user) return $this->json(array());
        $search = $this->input->get('search');
        $type = $this->input->get('type');
        $category = $this->input->get('category');
        foreach (array('search' => array($search, 100), 'type' => array($type, 40), 'category' => array($category, 80)) as $key => $rule) {
            if ($rule[0] !== NULL && (!is_string($rule[0]) || strlen($rule[0]) > $rule[1])) return $this->fail('Invalid ' . $key . ' filter.');
        }
        $sql = "SELECT c.id, c.title, c.slug, c.type, c.excerpt, c.body, c.cover_image, c.file_url, c.video_url, c.tags,
                       c.published_at, c.scheduled_at, c.seo_title, c.seo_description, cat.name AS category_name
                FROM contents c LEFT JOIN categories cat ON cat.id = c.category_id
                WHERE c.user_id = ? AND (c.status = 'published' OR (c.status = 'scheduled' AND c.scheduled_at <= NOW()))";
        $binds = array((int) $user['id']);
        if ($search !== NULL && $search !== '') {
            $sql .= " AND (c.title LIKE ? OR c.excerpt LIKE ? OR JSON_CONTAINS(c.tags, JSON_QUOTE(?)))";
            $binds[] = '%' . $search . '%';
            $binds[] = '%' . $search . '%';
            $binds[] = $search;
        }
        if ($type !== NULL && $type !== '') {
            $sql .= ' AND c.type = ?';
            $binds[] = $type;
        }
        if ($category !== NULL && $category !== '') {
            $sql .= ' AND cat.slug = ?';
            $binds[] = $category;
        }
        $sql .= ' ORDER BY COALESCE(c.published_at, c.scheduled_at) DESC';
        $items = $this->db->query($sql, $binds)->result_array();
        foreach ($items as &$item) $this->portfolio->normalize_content($item);
        unset($item);
        return $this->json($items);
    }

    public function contact()
    {
        if ($this->input->method(TRUE) !== 'POST') return $this->fail('Method not allowed.', 405);
        $input = $this->request_data();
        $name = $input['name'] ?? NULL;
        $email = $input['email'] ?? NULL;
        $subject = $input['subject'] ?? '';
        $message = $input['message'] ?? NULL;
        if (!$this->text_ok($name, 1, 120, TRUE) || !$this->text_ok($email, 1, 254) || !filter_var($email, FILTER_VALIDATE_EMAIL)
            || !$this->text_ok($subject, 0, 180) || !$this->text_ok($message, 10, 5000, TRUE)) {
            return $this->fail('Please check your name, email, subject, and message.');
        }
        $user = $this->portfolio->first_user();
        if (!$user) return $this->fail('The contact form is not available.', 503);
        $userId = (int) $user['id'];
        if ($this->db->query(
            'INSERT INTO contact_messages (user_id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)',
            array($userId, trim($name), $email, $subject, trim($message))
        ) === FALSE) return $this->database_error();
        if (!$this->record($userId, 'contact')) return $this->database_error();
        return $this->json(array('success' => TRUE, 'message' => "Thanks for your message. I'll be in touch soon."), 201);
    }

    public function download($id)
    {
        $item = $this->db->query(
            "SELECT id, file_url, title, user_id FROM contents
             WHERE id = ? AND (status = 'published' OR (status = 'scheduled' AND scheduled_at <= NOW()))",
            array((int) $id)
        )->row_array();
        if (!$item || !$item['file_url']) return $this->fail('Download not found.', 404);
        $this->record((int) $item['user_id'], 'download', '/content/' . (int) $id);
        return redirect($item['file_url']);
    }

    public function dashboard()
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        $counts = array();
        $queries = array(
            'visitors' => "SELECT COUNT(*) AS count FROM analytics WHERE user_id = ? AND event = 'visit'",
            'published' => "SELECT COUNT(*) AS count FROM contents WHERE user_id = ? AND status = 'published'",
            'drafts' => "SELECT COUNT(*) AS count FROM contents WHERE user_id = ? AND status = 'draft'",
            'downloads' => "SELECT COUNT(*) AS count FROM analytics WHERE user_id = ? AND event = 'download'",
            'messages' => 'SELECT COUNT(*) AS count FROM contact_messages WHERE user_id = ?',
        );
        foreach ($queries as $key => $sql) {
            $row = $this->db->query($sql, array($userId))->row_array();
            $counts[$key] = (int) ($row['count'] ?? 0);
        }
        $visitorCounts = $this->db->query(
            'SELECT COUNT(*) AS unique_visitors, COALESCE(SUM(visit_count), 0) AS total_visits
             FROM visitor_analytics WHERE user_id = ?', array($userId)
        )->row_array();
        $counts['unique_visitors'] = (int) ($visitorCounts['unique_visitors'] ?? 0);
        $counts['total_visits'] = (int) ($visitorCounts['total_visits'] ?? 0);
        $counts['locations'] = $this->db->query(
            'SELECT ip_address, country, region, city, latitude, longitude, accuracy, visit_count, first_seen, last_seen
             FROM visitor_analytics WHERE user_id = ?
             ORDER BY last_seen DESC LIMIT 100', array($userId)
        )->result_array();
        foreach ($counts['locations'] as &$location) {
            $location['visit_count'] = (int) $location['visit_count'];
            $location['latitude'] = $location['latitude'] !== NULL ? (float) $location['latitude'] : NULL;
            $location['longitude'] = $location['longitude'] !== NULL ? (float) $location['longitude'] : NULL;
        }
        unset($location);
        $counts['recent'] = $this->db->query(
            'SELECT event, path, ip_address, created_at FROM analytics WHERE user_id = ? ORDER BY created_at DESC LIMIT 6',
            array($userId)
        )->result_array();
        return $this->json($counts);
    }

    public function portfolio()
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        if ($this->input->method(TRUE) === 'GET') return $this->json($this->portfolio->site($userId, TRUE));
        if ($this->input->method(TRUE) !== 'PUT') return $this->fail('Method not allowed.', 405);
        $input = $this->request_data();
        list($valid, $data) = $this->validate_profile($input);
        if (!$valid) return $this->fail($data);
        $profile = array(
            'name' => $data['name'], 'designation' => $data['designation'], 'introduction' => $data['introduction'],
            'biography' => $data['biography'], 'location' => $data['location'], 'email' => $data['email'],
            'phone' => $data['phone'], 'profile_image' => $data['profile_image'], 'cover_image' => $data['cover_image'],
            'social_links' => $data['social_links'],
        );
        $snapshot = array(
            'profile' => $profile, 'qualifications' => $data['qualifications'], 'experiences' => $data['experiences'],
            'subjects' => array_map(function ($name) { return array('name' => $name); }, $data['subjects']),
            'skills' => array_map(function ($name) { return array('name' => $name); }, $data['skills']),
            'achievements' => $data['achievements'], 'testimonials' => $data['testimonials'],
        );
        $this->db->trans_begin();
        $this->db->query(
            'UPDATE teacher_profiles SET name=?, designation=?, introduction=?, biography=?, location=?, email=?, phone=?,
             profile_image=?, cover_image=?, social_links=?, updated_at=NOW() WHERE user_id=?',
            array($profile['name'], $profile['designation'], $profile['introduction'], $profile['biography'], $profile['location'],
                $profile['email'], $profile['phone'], $profile['profile_image'], $profile['cover_image'],
                json_encode($profile['social_links']), $userId)
        );
        $collections = array(
            'qualifications' => array('degree', 'institution', 'year'),
            'experiences' => array('role', 'organization', 'period', 'description'),
            'subjects' => array('name'),
            'skills' => array('name'),
            'achievements' => array('title', 'organization', 'year'),
            'testimonials' => array('quote', 'author', 'detail'),
        );
        foreach ($collections as $table => $columns) {
            $this->db->query('DELETE FROM ' . $table . ' WHERE user_id = ?', array($userId));
            $rows = $table === 'subjects' || $table === 'skills'
                ? array_map(function ($name) { return array('name' => $name); }, $data[$table])
                : $data[$table];
            foreach ($rows as $row) {
                $values = array($userId);
                foreach ($columns as $column) $values[] = $row[$column] ?? '';
                $marks = implode(',', array_fill(0, count($values), '?'));
                $this->db->query(
                    'INSERT INTO ' . $table . ' (user_id,' . implode(',', $columns) . ') VALUES (' . $marks . ')',
                    $values
                );
            }
        }
        $this->db->query(
            'UPDATE site_settings SET draft_portfolio=?, updated_at=NOW() WHERE user_id=?',
            array(json_encode($snapshot), $userId)
        );
        if ($this->db->trans_status() === FALSE) {
            $this->db->trans_rollback();
            return $this->fail('Could not save portfolio changes.', 500);
        }
        $this->db->trans_commit();
        return $this->json(array('success' => TRUE));
    }

    public function preview()
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        return $this->json($this->portfolio->site($userId, TRUE));
    }

    public function content()
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        if ($this->input->method(TRUE) === 'POST') return $this->create_content();
        if ($this->input->method(TRUE) !== 'GET') return $this->fail('Method not allowed.', 405);
        $items = $this->db->query(
            'SELECT c.*, cat.name AS category_name FROM contents c LEFT JOIN categories cat ON cat.id=c.category_id
             WHERE c.user_id=? ORDER BY c.updated_at DESC',
            array($userId)
        )->result_array();
        foreach ($items as &$item) $this->portfolio->normalize_content($item);
        unset($item);
        return $this->json(array('items' => $items, 'categories' => $this->portfolio->categories($userId)));
    }

    public function content_item($id)
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        $id = (int) $id;
        $method = $this->input->method(TRUE);
        if ($method === 'DELETE') {
            if ($this->db->query('DELETE FROM contents WHERE id=? AND user_id=?', array($id, $userId)) === FALSE) return $this->database_error();
            if (!$this->db->affected_rows()) return $this->fail('Content not found.', 404);
            return $this->json(array('success' => TRUE));
        }
        if ($method !== 'PUT') return $this->fail('Method not allowed.', 405);
        list($valid, $data) = $this->validate_content($this->request_data());
        if (!$valid) return $this->fail($data);
        $result = $this->db->query(
            "UPDATE contents SET category_id=?, title=?, type=?, excerpt=?, body=?, cover_image=?, file_url=?, video_url=?,
             tags=?, status=?, scheduled_at=?, seo_title=?, seo_description=?, updated_at=NOW(),
             published_at=CASE WHEN ?='published' THEN COALESCE(published_at, NOW()) ELSE NULL END
             WHERE id=? AND user_id=?",
            array($data['category_id'], $data['title'], $data['type'], $data['excerpt'], $data['body'], $data['cover_image'],
                $data['file_url'], $data['video_url'], $this->json_array($data['tags']), $data['status'], $data['scheduled_at'],
                $data['seo_title'], $data['seo_description'], $data['status'], $id, $userId)
        );
        if ($result === FALSE) return $this->database_error();
        $item = $this->db->query('SELECT * FROM contents WHERE id=? AND user_id=?', array($id, $userId))->row_array();
        if (!$item) return $this->fail('Content not found.', 404);
        $this->portfolio->normalize_content($item);
        return $this->json($item);
    }

    public function create_content()
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        if ($this->input->method(TRUE) !== 'POST') return $this->fail('Method not allowed.', 405);
        list($valid, $data) = $this->validate_content($this->request_data());
        if (!$valid) return $this->fail($data);
        $slug = $this->slugify($data['title']) . '-' . bin2hex(random_bytes(4));
        $result = $this->db->query(
            "INSERT INTO contents (user_id, category_id, title, slug, type, excerpt, body, cover_image, file_url, video_url,
             tags, status, scheduled_at, seo_title, seo_description, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ?='published' THEN NOW() ELSE NULL END)",
            array($userId, $data['category_id'], $data['title'], $slug, $data['type'], $data['excerpt'], $data['body'],
                $data['cover_image'], $data['file_url'], $data['video_url'], $this->json_array($data['tags']), $data['status'],
                $data['scheduled_at'], $data['seo_title'], $data['seo_description'], $data['status'])
        );
        if ($result === FALSE) return $this->database_error();
        $item = $this->db->query('SELECT * FROM contents WHERE id=?', array((int) $this->db->insert_id()))->row_array();
        $this->portfolio->normalize_content($item);
        return $this->json($item, 201);
    }

    public function categories()
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        if ($this->input->method(TRUE) !== 'POST') return $this->fail('Method not allowed.', 405);
        $rawName = $this->request_data()['name'] ?? NULL;
        if (!is_string($rawName)) return $this->fail('Category name is required.');
        $name = trim($rawName);
        if (!$this->text_ok($name, 1, 80)) return $this->fail('Category name is required.');
        $slug = $this->slugify($name);
        $this->db->query(
            'INSERT INTO categories (user_id, name, slug) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
            array($userId, $name, $slug)
        );
        $row = $this->db->query('SELECT id, name, slug FROM categories WHERE user_id=? AND slug=?', array($userId, $slug))->row_array();
        if (!$row) return $this->fail('Category not found.', 404);
        $row['id'] = (int) $row['id'];
        return $this->json($row, 201);
    }

    public function design()
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        if ($this->input->method(TRUE) !== 'PUT') return $this->fail('Method not allowed.', 405);
        $input = $this->request_data();
        $design = $input['design'] ?? NULL;
        $sections = $input['sections'] ?? NULL;
        if (!is_array($design) || !is_array($sections) || count($sections) !== count($this->sectionDefaults)
            || !in_array($input['template'] ?? NULL, $this->templates, TRUE)) {
            return $this->fail('Invalid design configuration.');
        }
        foreach (array('primary', 'accent', 'background') as $key) {
            if (!isset($design[$key]) || !is_string($design[$key]) || !preg_match('/^#[0-9a-f]{6}$/i', $design[$key])) return $this->fail('Invalid design configuration.');
        }
        if (!in_array($design['font'] ?? NULL, array('DM Sans', 'Georgia', 'Inter', 'Lora'), TRUE)
            || !in_array($design['radius'] ?? NULL, array('8px', '18px', '28px'), TRUE)
            || !in_array($design['layout'] ?? NULL, array('comfortable', 'compact', 'spacious'), TRUE)) {
            return $this->fail('Invalid design configuration.');
        }
        $expected = array_column($this->sectionDefaults, 'key');
        $keys = array();
        foreach ($sections as $section) {
            if (!is_array($section) || !isset($section['key'], $section['label']) || !is_string($section['key'])
                || !is_string($section['label']) || !isset($section['enabled']) || !is_bool($section['enabled'])) {
                return $this->fail('Invalid section configuration.');
            }
            $keys[] = $section['key'];
        }
        sort($keys);
        $expectedSorted = $expected;
        sort($expectedSorted);
        if ($keys !== $expectedSorted) return $this->fail('Invalid section configuration.');
        if ($this->db->query(
            'UPDATE site_settings SET draft_design=?, draft_template=?, draft_sections=?, updated_at=NOW() WHERE user_id=?',
            array(json_encode($design), $input['template'], json_encode($sections), $userId)
        ) === FALSE) return $this->database_error();
        return $this->json(array('success' => TRUE));
    }

    public function publish()
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        if ($this->input->method(TRUE) !== 'POST') return $this->fail('Method not allowed.', 405);
        if ($this->db->query(
            'UPDATE site_settings SET published_design=draft_design, published_template=draft_template,
             published_sections=draft_sections, published_portfolio=draft_portfolio, updated_at=NOW() WHERE user_id=?',
            array($userId)
        ) === FALSE) return $this->database_error();
        return $this->json(array('success' => TRUE));
    }

    public function reset_design()
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        if ($this->input->method(TRUE) !== 'POST') return $this->fail('Method not allowed.', 405);
        if ($this->db->query(
            "UPDATE site_settings SET draft_design=?, draft_template='modern', draft_sections=?, updated_at=NOW() WHERE user_id=?",
            array(json_encode($this->designDefaults), json_encode($this->sectionDefaults), $userId)
        ) === FALSE) return $this->database_error();
        return $this->json(array('success' => TRUE));
    }

    public function messages()
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        if ($this->input->method(TRUE) !== 'GET') return $this->fail('Method not allowed.', 405);
        $rows = $this->db->query('SELECT * FROM contact_messages WHERE user_id=? ORDER BY created_at DESC', array($userId))->result_array();
        foreach ($rows as &$row) {
            $row['id'] = (int) $row['id'];
            $row['is_read'] = (bool) $row['is_read'];
        }
        unset($row);
        return $this->json($rows);
    }

    public function read_message($id)
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        if ($this->input->method(TRUE) !== 'PATCH') return $this->fail('Method not allowed.', 405);
        $query = $this->db->query(
            'UPDATE contact_messages SET is_read=NOT is_read WHERE id=? AND user_id=?',
            array((int) $id, $userId)
        );
        if ($query === FALSE) return $this->database_error();
        $result = $this->db->query('SELECT id, is_read FROM contact_messages WHERE id=? AND user_id=?', array((int) $id, $userId))->row_array();
        if (!$result) return $this->fail('Message not found.', 404);
        $result['id'] = (int) $result['id'];
        $result['is_read'] = (bool) $result['is_read'];
        return $this->json($result);
    }

    public function upload()
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        if ($this->input->method(TRUE) !== 'POST') return $this->fail('Method not allowed.', 405);
        if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) return $this->fail('Choose a file to upload.');
        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $message = $file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE
                ? 'File exceeds the upload size limit.' : 'The file could not be uploaded.';
            return $this->fail($message);
        }
        $maxBytes = (int) (getenv('MAX_UPLOAD_MB') ?: 10) * 1024 * 1024;
        if ($file['size'] > $maxBytes) return $this->fail('File exceeds the upload size limit.');
        $types = array(
            'image/jpeg' => '.jpg', 'image/png' => '.png', 'image/webp' => '.webp', 'image/gif' => '.gif',
            'application/pdf' => '.pdf', 'application/msword' => '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => '.docx',
        );
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if (!isset($types[$mime])) return $this->fail('Only images, PDF, and Word documents are allowed.');
        $directory = getenv('UPLOAD_DIR') ?: 'uploads';
        if ($directory[0] !== DIRECTORY_SEPARATOR) $directory = FCPATH . $directory;
        if (!is_dir($directory) && !mkdir($directory, 0755, TRUE) && !is_dir($directory)) {
            log_message('error', 'Could not create upload directory: ' . $directory);
            return $this->fail('Could not prepare file storage.', 500);
        }
        $filename = bin2hex(random_bytes(16)) . $types[$mime];
        if (!move_uploaded_file($file['tmp_name'], rtrim($directory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $filename)) {
            return $this->fail('The file could not be saved.', 500);
        }
        $appBase = rtrim(getenv('APP_BASE_URL') ?: '/cap3/learn_with_time_n', '/');
        $url = $appBase . '/uploads/' . $filename;
        $originalName = basename($file['name']);
        $query = $this->db->query(
            'INSERT INTO media (user_id, url, original_name, mime_type) VALUES (?, ?, ?, ?)',
            array($userId, $url, $originalName, $mime)
        );
        if ($query === FALSE) {
            unlink(rtrim($directory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $filename);
            return $this->database_error();
        }
        $result = array('id' => (int) $this->db->insert_id());
        return $this->json(array('id' => (int) $result['id'], 'url' => $url, 'name' => $originalName, 'size' => (int) $file['size']), 201);
    }

    public function media()
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        if ($this->input->method(TRUE) !== 'GET') return $this->fail('Method not allowed.', 405);
        $rows = $this->db->query(
            'SELECT id, url, original_name, mime_type, created_at FROM media WHERE user_id=? ORDER BY created_at DESC',
            array($userId)
        )->result_array();
        foreach ($rows as &$row) $row['id'] = (int) $row['id'];
        unset($row);
        return $this->json($rows);
    }

    public function media_item($id)
    {
        $userId = $this->require_auth();
        if (!$userId) return;
        if ($this->input->method(TRUE) !== 'DELETE') return $this->fail('Method not allowed.', 405);
        if ($this->db->query('DELETE FROM media WHERE id=? AND user_id=?', array((int) $id, $userId)) === FALSE) return $this->database_error();
        if (!$this->db->affected_rows()) return $this->fail('Media item not found.', 404);
        return $this->json(array('success' => TRUE));
    }

    public function visitor_location()
    {
        if ($this->input->method(TRUE) !== 'POST') return $this->fail('Method not allowed.', 405);
        $user = $this->portfolio->first_user();
        if (!$user) return $this->fail('Portfolio has not been configured.', 503);

        $input = $this->request_data();
        $latitude = isset($input['latitude']) && is_numeric($input['latitude']) ? (float) $input['latitude'] : NULL;
        $longitude = isset($input['longitude']) && is_numeric($input['longitude']) ? (float) $input['longitude'] : NULL;
        $accuracy = isset($input['accuracy']) && is_numeric($input['accuracy']) ? (float) $input['accuracy'] : NULL;
        $country = isset($input['country']) && is_string($input['country']) ? substr(trim($input['country']), 0, 100) : '';
        $region = isset($input['region']) && is_string($input['region']) ? substr(trim($input['region']), 0, 100) : '';
        $city = isset($input['city']) && is_string($input['city']) ? substr(trim($input['city']), 0, 100) : '';

        if ($latitude !== NULL && ($latitude < -90 || $latitude > 90)) return $this->fail('Invalid latitude.');
        if ($longitude !== NULL && ($longitude < -180 || $longitude > 180)) return $this->fail('Invalid longitude.');

        $ip = $this->input->ip_address() ?: 'unknown';
        $sql = "UPDATE visitor_analytics
                SET country = CASE WHEN ? <> '' THEN ? ELSE country END,
                    region = CASE WHEN ? <> '' THEN ? ELSE region END,
                    city = CASE WHEN ? <> '' THEN ? ELSE city END,
                    latitude = COALESCE(?, latitude),
                    longitude = COALESCE(?, longitude),
                    accuracy = COALESCE(?, accuracy),
                    last_seen = NOW()
                WHERE user_id = ? AND ip_address = ?";
        $query = $this->db->query($sql, array(
            $country, $country, $region, $region, $city, $city,
            $latitude, $longitude, $accuracy, (int) $user['id'], $ip
        ));
        if ($query === FALSE) return $this->database_error();
        return $this->json(array('success' => TRUE));
    }
}
