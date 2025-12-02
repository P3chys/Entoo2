<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubjectComment;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class SubjectCommentController extends Controller
{
    #[OA\Get(
        path: '/api/subjects/{subjectName}/comments',
        summary: 'Get all comments for a subject',
        description: 'Returns all comments for a specific subject ordered by creation time (newest first).',
        tags: ['Subject Comments'],
        parameters: [
            new OA\Parameter(name: 'subjectName', in: 'path', required: true, schema: new OA\Schema(type: 'string'), description: 'Subject name'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Comments list',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'comments', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
        ]
    )]
    public function index(string $subjectName)
    {
        $comments = SubjectComment::where('subject_name', $subjectName)
            ->with('userRelation:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['comments' => $comments]);
    }

    #[OA\Post(
        path: '/api/subjects/{subjectName}/comments',
        summary: 'Create a new comment',
        description: 'Post a new comment on a subject profile. Requires authentication.',
        security: [['sanctum' => []]],
        tags: ['Subject Comments'],
        parameters: [
            new OA\Parameter(name: 'subjectName', in: 'path', required: true, schema: new OA\Schema(type: 'string'), description: 'Subject name'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['comment'],
                properties: [
                    new OA\Property(property: 'comment', type: 'string', example: 'Great course! Very informative.'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Comment created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Comment posted successfully'),
                        new OA\Property(property: 'comment', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Validation error'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function store(Request $request, string $subjectName)
    {
        $validated = $request->validate([
            'comment' => 'required|string|min:1|max:5000',
            'is_anonymous' => 'boolean',
        ]);

        $comment = SubjectComment::create([
            'subject_name' => $subjectName,
            'user_id' => $request->user()->id,
            'comment' => $validated['comment'],
            'is_anonymous' => $validated['is_anonymous'] ?? false,
        ]);

        $comment->load('userRelation:id,name');

        return response()->json([
            'message' => 'Comment posted successfully',
            'comment' => $comment,
        ], 201);
    }

    #[OA\Put(
        path: '/api/subjects/{subjectName}/comments/{id}',
        summary: 'Update a comment',
        description: 'Update an existing comment. Only the author can update their own comment.',
        security: [['sanctum' => []]],
        tags: ['Subject Comments'],
        parameters: [
            new OA\Parameter(name: 'subjectName', in: 'path', required: true, schema: new OA\Schema(type: 'string'), description: 'Subject name'),
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'Comment ID'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['comment'],
                properties: [
                    new OA\Property(property: 'comment', type: 'string', example: 'Updated comment text'),
                    new OA\Property(property: 'is_anonymous', type: 'boolean', example: false),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Comment updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Comment updated successfully'),
                        new OA\Property(property: 'comment', type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 403, description: 'Forbidden - not the comment author'),
            new OA\Response(response: 404, description: 'Comment not found'),
            new OA\Response(response: 422, description: 'Validation error'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function update(Request $request, string $subjectName, int $id)
    {
        $comment = SubjectComment::where('subject_name', $subjectName)
            ->where('id', $id)
            ->firstOrFail();

        // Only the author can update their own comment
        if ($comment->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'You can only edit your own comments',
            ], 403);
        }

        $validated = $request->validate([
            'comment' => 'required|string|min:1|max:5000',
            'is_anonymous' => 'boolean',
        ]);

        $comment->update($validated);
        $comment->load('userRelation:id,name');

        return response()->json([
            'message' => 'Comment updated successfully',
            'comment' => $comment,
        ]);
    }

    #[OA\Delete(
        path: '/api/subjects/{subjectName}/comments/{id}',
        summary: 'Delete a comment',
        description: 'Delete a comment. Only the author can delete their own comment.',
        security: [['sanctum' => []]],
        tags: ['Subject Comments'],
        parameters: [
            new OA\Parameter(name: 'subjectName', in: 'path', required: true, schema: new OA\Schema(type: 'string'), description: 'Subject name'),
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'Comment ID'),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Comment deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Comment deleted successfully'),
                    ]
                )
            ),
            new OA\Response(response: 403, description: 'Forbidden - not the comment author'),
            new OA\Response(response: 404, description: 'Comment not found'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function destroy(Request $request, string $subjectName, int $id)
    {
        $comment = SubjectComment::where('subject_name', $subjectName)
            ->where('id', $id)
            ->firstOrFail();

        // Only the author can delete their own comment
        if ($comment->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'You can only delete your own comments',
            ], 403);
        }

        $comment->delete();

        return response()->json([
            'message' => 'Comment deleted successfully',
        ]);
    }
}
