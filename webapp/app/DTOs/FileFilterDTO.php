<?php

namespace App\DTOs;

use Illuminate\Http\Request;

class FileFilterDTO extends BaseDTO
{
    public function __construct(
        public readonly ?string $subjectName,
        public readonly ?string $category,
        public readonly ?string $extension,
        public readonly ?int $userId,
        public readonly int $perPage = 20,
        public readonly int $page = 1
    ) {}

    public static function fromRequest(Request $request): self
    {
        return new self(
            subjectName: $request->input('subject_name'),
            category: $request->input('category'),
            extension: $request->input('extension'),
            userId: $request->input('user_id'),
            perPage: (int) $request->input('per_page', 20),
            page: (int) $request->input('page', 1)
        );
    }
}
