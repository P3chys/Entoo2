<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubjectComment extends Model
{
    protected $fillable = [
        'subject_name',
        'user_id',
        'comment',
        'is_anonymous',
    ];

    protected $casts = [
        'is_anonymous' => 'boolean',
    ];

    protected $appends = ['user'];
    protected $hidden = ['userRelation'];

    /**
     * Get the user who wrote this comment
     */
    public function userRelation()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get user data, hiding identity for anonymous comments
     */
    public function getUserAttribute()
    {
        // For anonymous comments, only return user data if viewing as the author
        if ($this->is_anonymous) {
            $currentUser = auth('sanctum')->user();

            // If the current user is the author, return their user data
            if ($currentUser && $currentUser->id === $this->user_id) {
                return $this->userRelation;
            }

            // Otherwise, return null to hide identity
            return null;
        }

        // For non-anonymous comments, return user data normally
        return $this->userRelation;
    }

    /**
     * Get the subject profile this comment belongs to
     */
    public function subjectProfile()
    {
        return $this->belongsTo(SubjectProfile::class, 'subject_name', 'subject_name');
    }
}
