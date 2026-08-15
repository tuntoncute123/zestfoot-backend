import { CreateOrderDto } from '../../dto/create-order.dto';

export class CreateOrderCommand {
  public readonly customer: any;
  public readonly items: any;
  public readonly sub_total?: number;
  public readonly shipping_fee?: number;
  public readonly discount?: number;
  public readonly total_amount?: number;
  public readonly status?: string;
  public readonly payment_method?: string;
  public readonly payment_info?: any;
  public readonly voucher_discount?: number;
  public readonly voucher_code?: string;
  public readonly point_discount?: number;

  constructor(dto: CreateOrderDto) {
    Object.assign(this, dto);
  }
}
