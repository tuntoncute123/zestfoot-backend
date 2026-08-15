import { CreateProductDto } from '../../dto/create-product.dto';

export class CreateProductCommand {
  public readonly name: string;
  public readonly brand?: string;
  public readonly price?: number;
  public readonly salePrice?: number;
  public readonly image?: string;
  public readonly isNew?: boolean;
  public readonly isSale?: boolean;
  public readonly isTrending?: boolean;
  public readonly isAsicsExclusive?: boolean;
  public readonly category?: string;
  public readonly subCategory?: string;
  public readonly gender?: string;
  public readonly badges?: any;

  constructor(dto: CreateProductDto) {
    Object.assign(this, dto);
  }
}
