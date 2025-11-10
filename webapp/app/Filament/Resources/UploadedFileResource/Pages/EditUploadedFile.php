<?php

namespace App\Filament\Resources\UploadedFileResource\Pages;

use App\Filament\Resources\UploadedFileResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditUploadedFile extends EditRecord
{
    protected static string $resource = UploadedFileResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
