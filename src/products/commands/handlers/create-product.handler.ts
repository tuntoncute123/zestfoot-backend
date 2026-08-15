import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateProductCommand } from '../impl/create-product.command';
import { PrismaService } from '../../../database/prisma.service';

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateProductCommand) {
    const product = await this.prisma.product.create({
      data: {
        name: command.name,
        brand: command.brand,
        price: command.price ? BigInt(command.price) : null,
        salePrice: command.salePrice ? BigInt(command.salePrice) : null,
        image: command.image,
        isNew: command.isNew ?? false,
        isSale: command.isSale ?? false,
        isTrending: command.isTrending ?? false,
        isAsicsExclusive: command.isAsicsExclusive ?? false,
        category: command.category,
        subCategory: command.subCategory,
        gender: command.gender,
        badges: command.badges ?? null,
      },
    });

    return {
      ...product,
      id: product.id.toString(),
      price: product.price ? Number(product.price) : null,
      salePrice: product.salePrice ? Number(product.salePrice) : null,
    };
  }
}
