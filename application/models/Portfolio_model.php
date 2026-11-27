<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Portfolio_model extends CI_Model
{

    protected $database;

    public function __construct()
    {
        parent::__construct();

        // Get database connection directly
        $this->db = $this->load->database('default', TRUE);

        if (!$this->db) {
            show_error('Unable to initialize database connection.');
        }
    }

    public function first_user()
    {
        $query = $this->db->query("SELECT id FROM users ORDER BY id ASC LIMIT 1" );

        return $query->row_array();
    }


    public function site($userId, $draft = FALSE)
    {
        $profile = $this->db->query('SELECT * FROM teacher_profiles WHERE user_id = ?', array($userId))->row_array();
        if ($profile && is_string($profile['social_links'])) {
            $profile['social_links'] = json_decode($profile['social_links'], TRUE) ?: array();
        }

        $settings = $this->db->query('SELECT * FROM site_settings WHERE user_id = ?', array($userId))->row_array();
        $portfolio = NULL;
        if ($settings) {
            $field = $draft ? 'draft_portfolio' : 'published_portfolio';
            $portfolio = $this->json_value($settings[$field] ?? NULL);
        }
        $contents = $this->db->query(
            "SELECT c.*, cat.name AS category_name FROM contents c
             LEFT JOIN categories cat ON cat.id = c.category_id
             WHERE c.user_id = ? AND (c.status = 'published' OR (c.status = 'scheduled' AND c.scheduled_at <= NOW()))
             ORDER BY COALESCE(c.published_at, c.scheduled_at) DESC",
            array($userId)
        )->result_array();
        foreach ($contents as &$content) {
            $this->normalize_content($content);
        }
        unset($content);

        $appBase = rtrim(getenv('APP_BASE_URL') ?: '/cap3/learn_with_time_n', '/');

        $gallery = $this->db->query(
            "SELECT id, url, original_name FROM media WHERE user_id = ? AND mime_type LIKE 'image/%' ORDER BY created_at DESC",
            array($userId)
        )->result_array();
        foreach ($gallery as &$item) {
            $item['id'] = (int) $item['id'];
            if (isset($item['url']) && strpos($item['url'], '/uploads/') === 0) {
                $item['url'] = $item['url'];
            }
        }
        unset($item);

        $publicProfile = $portfolio['profile'] ?? $profile;
        if (is_array($publicProfile)) {
            foreach (array('profile_image', 'cover_image') as $key) {
                if (!empty($publicProfile[$key]) && strpos($publicProfile[$key], '/uploads/') === 0) {
                    $publicProfile[$key] =  $publicProfile[$key];
                }
            }
        }

        return array(
            'profile' => $portfolio['profile'] ?? $profile,
            'qualifications' => $portfolio['qualifications'] ?? $this->rows('qualifications', $userId),
            'experiences' => $portfolio['experiences'] ?? $this->rows('experiences', $userId),
            'subjects' => $portfolio['subjects'] ?? $this->rows('subjects', $userId),
            'skills' => $portfolio['skills'] ?? $this->rows('skills', $userId),
            'achievements' => $portfolio['achievements'] ?? $this->rows('achievements', $userId),
            'testimonials' => $portfolio['testimonials'] ?? $this->rows('testimonials', $userId),
            'gallery' => $gallery,
            'contents' => $contents,
            'categories' => $this->categories($userId),
            'design' => $this->json_value($settings[$draft ? 'draft_design' : 'published_design'] ?? NULL),
            'template' => $settings[$draft ? 'draft_template' : 'published_template'] ?? NULL,
            'sections' => $this->json_value($settings[$draft ? 'draft_sections' : 'published_sections'] ?? NULL),
        );
    }

    public function rows($table, $userId)
    {
        $columns = array(
            'qualifications' => 'id, degree, institution, year',
            'experiences' => 'id, role, organization, period, description',
            'subjects' => 'id, name',
            'skills' => 'id, name',
            'achievements' => 'id, title, organization, year',
            'testimonials' => 'id, quote, author, detail',
        );
        if (!isset($columns[$table])) {
            return array();
        }
        $rows = $this->db->query(
            'SELECT ' . $columns[$table] . ' FROM ' . $table . ' WHERE user_id = ? ORDER BY id',
            array($userId)
        )->result_array();
        foreach ($rows as &$row) {
            if (isset($row['id'])) {
                $row['id'] = (int) $row['id'];
            }
        }
        return $rows;
    }

    public function categories($userId)
    {
        $rows = $this->db->query('SELECT id, name, slug FROM categories WHERE user_id = ? ORDER BY name', array($userId))->result_array();
        foreach ($rows as &$row) {
            $row['id'] = (int) $row['id'];
        }
        return $rows;
    }

    public function normalize_content(&$content)
    {
        foreach (array('id', 'category_id') as $key) {
            if (isset($content[$key])) {
                $content[$key] = (int) $content[$key];
            }
        }
        if (isset($content['tags']) && is_string($content['tags'])) {
            $decoded = json_decode($content['tags'], TRUE);
            $content['tags'] = is_array($decoded) ? $decoded : array();
        }
    }

    public function json_value($value)
    {
        if (!is_string($value)) {
            return $value;
        }
        $decoded = json_decode($value, TRUE);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
    }
}
