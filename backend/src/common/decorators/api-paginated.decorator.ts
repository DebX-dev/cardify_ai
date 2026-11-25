import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/** Swagger helper documenting a paginated response wrapper `{ items, total, page, limit }`. */
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          total: { type: 'number', example: 42 },
          page: { type: 'number', example: 1 },
          limit: { type: 'number', example: 20 },
        },
      },
    }),
  );
};
