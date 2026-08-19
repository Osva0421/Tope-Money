import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CurrentUserId } from '../auth/auth-user';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  getAllCategories(@CurrentUserId() userId: string) {
    return this.categoriesService.getAllCategories(userId);
  }

  @Post()
  createCategory(
    @Body()
    body: {
      name: string;
      type: string;
      nature: string;
      icon?: string;
      parentId?: string;
    },
    @CurrentUserId() userId: string,
  ) {
    return this.categoriesService.createCategory({ ...body, userId });
  }

  @Patch(':id')
  updateCategory(
    @Param('id') id: string,
    @Body() body: { keywords?: string[]; name?: string; icon?: string },
    @CurrentUserId() userId: string,
  ) {
    return this.categoriesService.updateCategory(id, userId, body);
  }
}
