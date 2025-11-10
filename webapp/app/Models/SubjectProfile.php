<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubjectProfile extends Model
{
    protected $fillable = [
        'subject_name',
        'description',
        'professor_name',
        'course_code',
        'semester',
        'year',
        'notes',
        'color',
        'credits',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'year' => 'integer',
        'credits' => 'integer',
    ];

    protected $appends = ['file_count'];

    /**
     * Get the user who created this profile
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated this profile
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get uploaded files for this subject
     */
    public function uploadedFiles()
    {
        return $this->hasMany(UploadedFile::class, 'subject_name', 'subject_name');
    }

    /**
     * Get file count for this subject
     * Note: Use withCount('uploadedFiles') when eager loading to avoid N+1 queries
     */
    public function getFileCountAttribute()
    {
        // If loaded via withCount('uploadedFiles'), use that cached count
        // Laravel's withCount stores it as 'uploaded_files_count'
        if (array_key_exists('uploaded_files_count', $this->attributes)) {
            return (int) $this->attributes['uploaded_files_count'];
        }

        // Otherwise fall back to direct query (will cause N+1 if used in loops)
        return $this->uploadedFiles()->count();
    }
}
