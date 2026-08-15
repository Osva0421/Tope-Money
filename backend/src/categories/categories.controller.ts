import { Controller, Get, Post, Body } from '@nestjs/common';
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
  @Body() body: { name: string; type: string; userId: string; icon?: string; parentId?: string },
) {
  return this.categoriesService.createCategory(body);
}
}