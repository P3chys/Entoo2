<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FavoriteSubject extends Model
{
    protected $fillable = [
        'user_id',
        'subject_name',
    ];

    protected $casts = [
        'user_id' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
