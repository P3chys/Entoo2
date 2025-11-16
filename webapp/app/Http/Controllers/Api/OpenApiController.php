<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'Entoo API Documentation',
    description: 'RESTful API for Entoo - Document Management System for University Course Materials',
    contact: new OA\Contact(name: 'Entoo Development Team')
)]
#[OA\Server(
    url: 'http://localhost:8000',
    description: 'Local Development Server'
)]
#[OA\Server(
    url: 'https://entoo.example.com',
    description: 'Production Server'
)]
#[OA\SecurityScheme(
    securityScheme: 'sanctum',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'Token',
    description: 'Laravel Sanctum Token Authentication'
)]
#[OA\Tag(name: 'Authentication', description: 'User authentication and profile management')]
#[OA\Tag(name: 'Subjects', description: 'Subject browsing and management')]
#[OA\Tag(name: 'Files', description: 'File upload, download, and management')]
#[OA\Tag(name: 'Search', description: 'Full-text search using Elasticsearch')]
#[OA\Tag(name: 'Favorites', description: 'User favorite subjects management')]
#[OA\Tag(name: 'Subject Profiles', description: 'Rich subject information management')]
#[OA\Tag(name: 'Health', description: 'System health checks')]
#[OA\Tag(name: 'Admin', description: 'Administrative functions')]
class OpenApiController extends Controller
{
    //
}
