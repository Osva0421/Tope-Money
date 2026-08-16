import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  getAllCategories() {
    return this.categoriesService.getAllCategories();
  }

  @Post()
  createCategory(
    @Body()
    body: {
      name: string;
      type: string;
      nature: string;
      userId: string;
      icon?: string;
      parentId?: string;
    },
  ) {
    return this.categoriesService.createCategory(body);
  }

  @Patch(':id')
  updateCategory(
    @Param('id') id: string,
    @Body() body: { keywords?: string[]; name?: string; icon?: string },
  ) {
    return this.categoriesService.updateCategory(id, body);
  }
}
