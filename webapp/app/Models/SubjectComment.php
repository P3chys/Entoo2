<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubjectComment extends Model
{
    protected $fillable = [
        'subject_name',
        'user_id',
        'comment',
    ];

    /**
     * Get the user who wrote this comment
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the subject profile this comment belongs to
     */
    public function subjectProfile()
    {
        return $this->belongsTo(SubjectProfile::class, 'subject_name', 'subject_name');
    }
}
