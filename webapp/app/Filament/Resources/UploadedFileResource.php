<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UploadedFileResource\Pages;
use App\Models\UploadedFile;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class UploadedFileResource extends Resource
{
    protected static ?string $model = UploadedFile::class;

    protected static ?string $navigationIcon = 'heroicon-o-document-text';

    protected static ?string $navigationGroup = 'Content';

    protected static ?int $navigationSort = 2;

    protected static ?string $label = 'Uploaded File';

    protected static ?string $pluralLabel = 'Uploaded Files';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('File Information')
                    ->schema([
                        Forms\Components\TextInput::make('original_filename')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('subject_name')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\Select::make('category')
                            ->required()
                            ->options([
                                'Materialy' => 'Materialy',
                                'Otazky' => 'Otazky',
                                'Prednasky' => 'Prednasky',
                                'Seminare' => 'Seminare',
                            ]),
                        Forms\Components\TextInput::make('file_extension')
                            ->maxLength(10),
                        Forms\Components\TextInput::make('file_size')
                            ->numeric()
                            ->label('File Size (bytes)'),
                    ])->columns(2),

                Forms\Components\Section::make('Processing Status')
                    ->schema([
                        Forms\Components\Select::make('processing_status')
                            ->options([
                                'pending' => 'Pending',
                                'processing' => 'Processing',
                                'completed' => 'Completed',
                                'failed' => 'Failed',
                            ])
                            ->default('completed'),
                    ]),

                Forms\Components\Section::make('User')
                    ->schema([
                        Forms\Components\Select::make('user_id')
                            ->relationship('user', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn($query) => $query->with('user'))
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->sortable(),
                Tables\Columns\TextColumn::make('original_filename')
                    ->searchable()
                    ->limit(30)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        if (strlen($state) <= 30) {
                            return null;
                        }
                        return $state;
                    }),
                Tables\Columns\TextColumn::make('subject_name')
                    ->sortable()
                    ->searchable(),
                Tables\Columns\TextColumn::make('category')
                    ->sortable()
                    ->searchable()
                    ->badge()
                    ->color(fn(string $state): string => match ($state) {
                        'Materialy' => 'success',
                        'Otazky' => 'info',
                        'Prednasky' => 'warning',
                        'Seminare' => 'danger',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('file_extension')
                    ->searchable()
                    ->badge(),
                Tables\Columns\TextColumn::make('file_size')
                    ->sortable()
                    ->formatStateUsing(fn($state) => number_format($state / 1024, 2) . ' KB'),
                Tables\Columns\TextColumn::make('user.name')
                    ->sortable()
                    ->searchable(),
                Tables\Columns\TextColumn::make('processing_status')
                    ->badge()
                    ->color(fn(string $state): string => match ($state) {
                        'completed' => 'success',
                        'processing' => 'warning',
                        'failed' => 'danger',
                        'pending' => 'gray',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('category')
                    ->options([
                        'Materialy' => 'Materialy',
                        'Otazky' => 'Otazky',
                        'Prednasky' => 'Prednasky',
                        'Seminare' => 'Seminare',
                    ]),
                Tables\Filters\SelectFilter::make('file_extension')
                    ->options([
                        'pdf' => 'PDF',
                        'doc' => 'DOC',
                        'docx' => 'DOCX',
                        'ppt' => 'PPT',
                        'pptx' => 'PPTX',
                        'txt' => 'TXT',
                    ]),
                Tables\Filters\SelectFilter::make('processing_status')
                    ->options([
                        'pending' => 'Pending',
                        'processing' => 'Processing',
                        'completed' => 'Completed',
                        'failed' => 'Failed',
                    ]),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->paginated([10, 25, 50, 100]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUploadedFiles::route('/'),
            'create' => Pages\CreateUploadedFile::route('/create'),
            'edit' => Pages\EditUploadedFile::route('/{record}/edit'),
        ];
    }
}
