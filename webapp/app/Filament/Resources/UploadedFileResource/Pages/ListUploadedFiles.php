<?php

namespace App\Filament\Resources\UploadedFileResource\Pages;

use App\Filament\Resources\UploadedFileResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListUploadedFiles extends ListRecords
{
    protected static string $resource = UploadedFileResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
