<?php

namespace App\DTOs;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Http\Request;
use ReflectionClass;
use ReflectionProperty;

abstract class BaseDTO implements Arrayable
{
    public function toArray(): array
    {
        $reflection = new ReflectionClass($this);
        $properties = $reflection->getProperties(ReflectionProperty::IS_PUBLIC);
        $data = [];

        foreach ($properties as $property) {
            if ($property->isInitialized($this)) {
                $data[$property->getName()] = $property->getValue($this);
            }
        }

        return $data;
    }

    /**
     * Create a DTO from a Request object.
     * Must be implemented by child classes to map request data to properties.
     */
    abstract public static function fromRequest(Request $request): self;
}
