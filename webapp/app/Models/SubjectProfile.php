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
     * Get file count for this subject
     */
    public function getFileCountAttribute()
    {
        return UploadedFile::where('subject_name', $this->subject_name)->count();
    }
}
