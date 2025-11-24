<?php

namespace App\DTOs;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

class CreateFileDTO extends BaseDTO
{
    public function __construct(
        public readonly UploadedFile $file,
        public readonly string $subjectName,
        public readonly string $category,
        public readonly User $user
    ) {}

    public static function fromRequest(Request $request): self
    {
        // Assumes validation has already passed in the controller
        return new self(
            file: $request->file('file'),
            subjectName: $request->input('subject_name'),
            category: $request->input('category'),
            user: $request->user()
        );
    }
}
