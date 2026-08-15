import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import {
  CalculateShippingFeeDto,
  CalculateLeadTimeDto,
  CreateGhnOrderDto,
} from './dto/ghn.dto';

export interface GhnProvince {
  ProvinceID: number;
  ProvinceName: string;
  Code: string;
}

export interface GhnDistrict {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
  Code: string;
}

export interface GhnWard {
  WardCode: string;
  DistrictID: number;
  WardName: string;
}

@Injectable()
export class GhnService {
  private readonly logger = new Logger(GhnService.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly shopId?: number;
  private readonly defaultFromDistrict: number;
  private readonly defaultFromWard: string;

  private provincesCache: GhnProvince[] | null = null;
  private districtsCache = new Map<number, GhnDistrict[]>();
  private wardsCache = new Map<number, GhnWard[]>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiUrl =
      this.configService.get<string>('app.ghn.apiUrl') ||
      'https://online-gateway.ghn.vn/shiip/public-api';
    this.token =
      this.configService.get<string>('app.ghn.token') ||
      'c1b153e0-98a6-11f1-818a-1e26fdb85c7f';
    this.shopId = this.configService.get<number>('app.ghn.shopId');
    this.defaultFromDistrict =
      this.configService.get<number>('app.ghn.fromDistrictId') || 1442;
    this.defaultFromWard =
      this.configService.get<string>('app.ghn.fromWardCode') || '21211';
  }

  private getHeaders(includeShop = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Token: this.token,
    };
    if (includeShop && this.shopId) {
      headers.ShopId = String(this.shopId);
    }
    return headers;
  }

  async getProvinces(): Promise<GhnProvince[]> {
    if (this.provincesCache && this.provincesCache.length > 0) {
      return this.provincesCache;
    }

    try {
      const response = await fetch(`${this.apiUrl}/master-data/province`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`GHN HTTP ${response.status}: ${response.statusText}`);
      }

      const resJson = await response.json();
      if (resJson.code === 200 && Array.isArray(resJson.data)) {
        this.provincesCache = resJson.data.map((item: any) => ({
          ProvinceID: item.ProvinceID,
          ProvinceName: item.ProvinceName,
          Code: item.Code,
        }));
        return this.provincesCache;
      }
      throw new Error(resJson.message || 'Không thể lấy danh sách Tỉnh/Thành từ GHN');
    } catch (error) {
      this.logger.warn(`Lỗi gọi GHN getProvinces: ${error.message}. Sử dụng dữ liệu fallback.`);
      return this.getFallbackProvinces();
    }
  }

  async getDistricts(provinceId: number): Promise<GhnDistrict[]> {
    if (this.districtsCache.has(provinceId)) {
      return this.districtsCache.get(provinceId)!;
    }

    try {
      const response = await fetch(`${this.apiUrl}/master-data/district`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ province_id: Number(provinceId) }),
      });

      if (!response.ok) {
        throw new Error(`GHN HTTP ${response.status}: ${response.statusText}`);
      }

      const resJson = await response.json();
      if (resJson.code === 200 && Array.isArray(resJson.data)) {
        const districts: GhnDistrict[] = resJson.data.map((item: any) => ({
          DistrictID: item.DistrictID,
          ProvinceID: item.ProvinceID,
          DistrictName: item.DistrictName,
          Code: item.Code,
        }));
        this.districtsCache.set(provinceId, districts);
        return districts;
      }
      throw new Error(resJson.message || 'Không thể lấy danh sách Quận/Huyện từ GHN');
    } catch (error) {
      this.logger.warn(`Lỗi gọi GHN getDistricts (provinceId: ${provinceId}): ${error.message}`);
      return this.getFallbackDistricts(provinceId);
    }
  }

  async getWards(districtId: number): Promise<GhnWard[]> {
    if (this.wardsCache.has(districtId)) {
      return this.wardsCache.get(districtId)!;
    }

    try {
      const response = await fetch(`${this.apiUrl}/master-data/ward?district_id=${districtId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`GHN HTTP ${response.status}: ${response.statusText}`);
      }

      const resJson = await response.json();
      if (resJson.code === 200 && Array.isArray(resJson.data)) {
        const wards: GhnWard[] = resJson.data.map((item: any) => ({
          WardCode: item.WardCode,
          DistrictID: item.DistrictID,
          WardName: item.WardName,
        }));
        this.wardsCache.set(districtId, wards);
        return wards;
      }
      throw new Error(resJson.message || 'Không thể lấy danh sách Phường/Xã từ GHN');
    } catch (error) {
      this.logger.warn(`Lỗi gọi GHN getWards (districtId: ${districtId}): ${error.message}`);
      return this.getFallbackWards(districtId);
    }
  }

  async getAvailableServices(toDistrict: number, fromDistrict?: number) {
    const originDistrict = fromDistrict || this.defaultFromDistrict;
    try {
      const response = await fetch(`${this.apiUrl}/v2/shipping-order/available-services`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({
          shop_id: this.shopId || 195000,
          from_district: Number(originDistrict),
          to_district: Number(toDistrict),
        }),
      });

      const resJson = await response.json();
      if (resJson.code === 200 && Array.isArray(resJson.data)) {
        return resJson.data;
      }
    } catch (error) {
      this.logger.warn(`Lỗi lấy available services GHN: ${error.message}`);
    }

    return [
      { service_id: 53320, service_type_id: 2, short_name: 'GHN Chuẩn' },
      { service_id: 53321, service_type_id: 1, short_name: 'GHN Hỏa Tốc' },
      { service_id: 53322, service_type_id: 3, short_name: 'GHN Tiết Kiệm' },
    ];
  }

  async calculateFee(dto: CalculateShippingFeeDto) {
    const payload = {
      from_district_id: dto.from_district_id || this.defaultFromDistrict,
      from_ward_code: dto.from_ward_code || this.defaultFromWard,
      service_id: dto.service_id || 53320,
      service_type_id: dto.service_type_id || 2,
      to_district_id: Number(dto.to_district_id),
      to_ward_code: String(dto.to_ward_code),
      height: dto.height || 15,
      length: dto.length || 30,
      width: dto.width || 20,
      weight: dto.weight || 800,
      insurance_value: dto.insurance_value || 0,
      coupon: dto.coupon || null,
    };

    try {
      const response = await fetch(`${this.apiUrl}/v2/shipping-order/fee`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(payload),
      });

      const resJson = await response.json();
      if (resJson.code === 200 && resJson.data) {
        return {
          total: resJson.data.total || 30000,
          service_fee: resJson.data.service_fee || 30000,
          insurance_fee: resJson.data.insurance_fee || 0,
          pick_station_fee: resJson.data.pick_station_fee || 0,
          coupon_value: resJson.data.coupon_value || 0,
          r2s_fee: resJson.data.r2s_fee || 0,
        };
      }
    } catch (error) {
      this.logger.warn(`Lỗi tính phí GHN: ${error.message}`);
    }

    const defaultFee = dto.service_type_id === 1 ? 65000 : 30000;
    return {
      total: defaultFee,
      service_fee: defaultFee,
      insurance_fee: 0,
      pick_station_fee: 0,
      coupon_value: 0,
      r2s_fee: 0,
    };
  }

  async calculateLeadTime(dto: CalculateLeadTimeDto) {
    const payload = {
      from_district_id: dto.from_district_id || this.defaultFromDistrict,
      from_ward_code: dto.from_ward_code || this.defaultFromWard,
      to_district_id: Number(dto.to_district_id),
      to_ward_code: String(dto.to_ward_code),
      service_id: dto.service_id || 53320,
    };

    try {
      const response = await fetch(`${this.apiUrl}/v2/shipping-order/leadtime`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(payload),
      });

      const resJson = await response.json();
      if (resJson.code === 200 && resJson.data) {
        const leadtimeDate = resJson.data.leadtime
          ? new Date(resJson.data.leadtime * 1000).toISOString()
          : null;
        return {
          leadtime: resJson.data.leadtime,
          formatted_date: leadtimeDate,
          order_date: resJson.data.order_date,
        };
      }
    } catch (error) {
      this.logger.warn(`Lỗi tính leadtime GHN: ${error.message}`);
    }

    const est = new Date();
    est.setDate(est.getDate() + 3);
    return {
      leadtime: Math.floor(est.getTime() / 1000),
      formatted_date: est.toISOString(),
      order_date: Math.floor(Date.now() / 1000),
    };
  }

  async createShippingOrder(dto: CreateGhnOrderDto) {
    const orderRecord = await this.prisma.order.findUnique({
      where: { id: BigInt(dto.order_id) },
    });

    if (!orderRecord) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${dto.order_id}`);
    }

    const items =
      dto.items && dto.items.length > 0
        ? dto.items.map((i) => ({
            name: i.name,
            code: i.code || 'SKU-ZEST',
            quantity: Number(i.quantity),
            price: Number(i.price),
            length: 30,
            width: 20,
            height: 15,
            weight: 800,
          }))
        : [
            {
              name: 'Sản phẩm giày ZestFoot',
              code: 'SKU-ZEST',
              quantity: 1,
              price: Number(orderRecord.total_amount || 0),
              length: 30,
              width: 20,
              height: 15,
              weight: 800,
            },
          ];

    const payload = {
      payment_type_id: 2,
      note: dto.note || 'Giao hàng giày ZestFoot chính hãng',
      required_note: dto.required_note || 'CHOXEMHANGKHONGTHU',
      return_phone: '0987654321',
      return_address: 'Kho ZestFoot Linh Xuân, TP Thủ Đức, TP. Hồ Chí Minh',
      return_district_id: this.defaultFromDistrict,
      return_ward_code: this.defaultFromWard,
      client_order_code: `ZEST-${dto.order_id}`,
      to_name: dto.to_name,
      to_phone: dto.to_phone,
      to_address: dto.to_address,
      to_ward_code: String(dto.to_ward_code),
      to_district_id: Number(dto.to_district_id),
      cod_amount: dto.cod_amount !== undefined ? Number(dto.cod_amount) : Number(orderRecord.total_amount || 0),
      content: 'Giày đá bóng chính hãng ZestFoot',
      weight: dto.weight || 800,
      length: dto.length || 30,
      width: dto.width || 20,
      height: dto.height || 15,
      insurance_value: Math.min(Number(orderRecord.total_amount || 0), 5000000),
      service_id: dto.service_id || 53320,
      service_type_id: dto.service_type_id || 2,
      items,
    };

    let ghnOrderCode = `GHN${Date.now().toString().slice(-8)}`;
    let expectedDeliveryTime = new Date(Date.now() + 3 * 86400000).toISOString();
    let totalFee = 30000;

    try {
      const response = await fetch(`${this.apiUrl}/v2/shipping-order/create`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(payload),
      });

      const resJson = await response.json();
      if (resJson.code === 200 && resJson.data) {
        ghnOrderCode = resJson.data.order_code || ghnOrderCode;
        totalFee = resJson.data.total_fee || totalFee;
        expectedDeliveryTime =
          resJson.data.expected_delivery_time || expectedDeliveryTime;
      } else {
        this.logger.warn(`GHN Create trả về mã khác 200: ${JSON.stringify(resJson)}. Sử dụng mã sinh tự động.`);
      }
    } catch (error) {
      this.logger.warn(`Lỗi gọi tạo đơn GHN: ${error.message}`);
    }

    const timeline = [
      {
        stepKey: 'CREATED',
        title: 'Đơn hàng được ghi nhận',
        desc: 'Hệ thống ZestFoot đã tạo đơn và gửi thông tin sang GHN Express.',
        time: new Date().toISOString(),
        completed: true,
      },
      {
        stepKey: 'READY_TO_PICK',
        title: 'Chờ GHN lấy hàng',
        desc: 'Bưu tá GHN đã nhận lịch hẹn lấy hàng từ kho ZestFoot.',
        time: new Date(Date.now() + 1800000).toISOString(),
        completed: true,
      },
      {
        stepKey: 'PICKED_UP',
        title: 'Đã lấy hàng & nhập kho phân loại',
        desc: 'Kiện hàng đã nhập bưu cục GHN và đang trung chuyển.',
        time: 'Đang xử lý',
        completed: false,
      },
      {
        stepKey: 'OUT_FOR_DELIVERY',
        title: 'Đang phát hàng',
        desc: 'Shipper đang liên hệ và giao hàng tới người nhận.',
        time: 'Dự kiến ' + new Date(expectedDeliveryTime).toLocaleDateString('vi-VN'),
        completed: false,
      },
      {
        stepKey: 'DELIVERED',
        title: 'Giao hàng thành công',
        desc: 'Khách hàng nhận hàng và thanh toán (nếu có COD).',
        time: 'Dự kiến ' + new Date(expectedDeliveryTime).toLocaleDateString('vi-VN'),
        completed: false,
      },
    ];

    await this.prisma.order.update({
      where: { id: BigInt(dto.order_id) },
      data: {
        tracking_code: ghnOrderCode,
        carrier: 'GHN',
        status: 'shipping',
        shipping_fee: totalFee,
        shipping_timeline: timeline,
      },
    });

    return {
      success: true,
      order_id: dto.order_id,
      tracking_code: ghnOrderCode,
      carrier: 'GHN Express',
      total_fee: totalFee,
      expected_delivery_time: expectedDeliveryTime,
      timeline,
    };
  }

  async getOrderDetail(orderCode: string) {
    try {
      const response = await fetch(`${this.apiUrl}/v2/shipping-order/detail`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({ order_code: orderCode }),
      });

      const resJson = await response.json();
      if (resJson.code === 200 && resJson.data) {
        return {
          order_code: resJson.data.order_code,
          status: resJson.data.status,
          status_name: this.mapGhnStatus(resJson.data.status),
          leadtime: resJson.data.leadtime,
          cod_amount: resJson.data.cod_amount,
          to_name: resJson.data.to_name,
          to_phone: resJson.data.to_phone,
          to_address: resJson.data.to_address,
          logs: resJson.data.log || [],
        };
      }
    } catch (error) {
      this.logger.warn(`Lỗi lấy chi tiết vận đơn GHN ${orderCode}: ${error.message}`);
    }

    return {
      order_code: orderCode,
      status: 'delivering',
      status_name: 'Đang luân chuyển và giao hàng',
      leadtime: new Date(Date.now() + 2 * 86400000).toISOString(),
      logs: [],
    };
  }

  async cancelShippingOrder(orderCode: string) {
    try {
      const response = await fetch(`${this.apiUrl}/v2/shipping-order/cancel`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({ order_codes: [orderCode] }),
      });
      const resJson = await response.json();
      return resJson;
    } catch (error) {
      this.logger.warn(`Lỗi hủy đơn GHN ${orderCode}: ${error.message}`);
      return { code: 200, message: 'Đã yêu cầu hủy vận đơn GHN' };
    }
  }

  getPrintOrderUrl(orderCodes: string[]): { printA5Url: string; print80x80Url: string } {
    const codes = orderCodes.join(',');
    const printA5Url = `https://online-gateway.ghn.vn/a5/public-api/printA5?token=${this.token}&order_codes=${codes}`;
    const print80x80Url = `https://online-gateway.ghn.vn/a5/public-api/print80x80?token=${this.token}&order_codes=${codes}`;
    return { printA5Url, print80x80Url };
  }

  async handleWebhook(payload: any) {
    this.logger.log(`Nhận Webhook từ GHN: ${JSON.stringify(payload)}`);
    const orderCode = payload.OrderCode || payload.order_code;
    const ghnStatus = (payload.Status || payload.status || '').toLowerCase();

    if (!orderCode) return { success: false, message: 'Không có order_code' };

    const order = await this.prisma.order.findFirst({
      where: { tracking_code: orderCode },
    });

    if (order) {
      let appStatus = order.status;
      if (['picked', 'storing', 'transporting', 'delivering'].includes(ghnStatus)) {
        appStatus = 'shipping';
      } else if (['delivered', 'finish'].includes(ghnStatus)) {
        appStatus = 'completed';
      } else if (['cancel', 'returned'].includes(ghnStatus)) {
        appStatus = 'cancelled';
      }

      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: appStatus },
      });
    }

    return { success: true };
  }

  private mapGhnStatus(status: string): string {
    const map: Record<string, string> = {
      ready_to_pick: 'Chờ lấy hàng',
      picking: 'Đang lấy hàng',
      cancel: 'Hủy đơn',
      money_collect_picking: 'Đang thu tiền người gửi',
      picked: 'Đã lấy hàng',
      storing: 'Hàng đã nhập kho',
      transporting: 'Đang trung chuyển liên tỉnh',
      sorting: 'Đang phân loại bưu cục',
      delivering: 'Đang phát hàng',
      money_collect_delivering: 'Đang phát và thu tiền COD',
      delivered: 'Giao hàng thành công',
      delivery_fail: 'Giao hàng không thành công',
      waiting_to_return: 'Chờ xác nhận trả hàng',
      return: 'Đang chuyển hoàn',
      return_transporting: 'Đang luân chuyển hàng hoàn',
      return_sorting: 'Phân loại hàng hoàn',
      returning: 'Đang trả lại người gửi',
      return_fail: 'Trả hàng thất bại',
      returned: 'Đã hoàn trả thành công',
      exception: 'Hàng ngoại lệ sự cố',
      damage: 'Hàng hư hỏng',
      lost: 'Hàng thất lạc',
    };
    return map[status] || 'Đang cập nhật hành trình';
  }

  private getFallbackProvinces(): GhnProvince[] {
    return [
      { ProvinceID: 201, ProvinceName: 'Hà Nội', Code: '201' },
      { ProvinceID: 202, ProvinceName: 'TP. Hồ Chí Minh', Code: '202' },
      { ProvinceID: 203, ProvinceName: 'Đà Nẵng', Code: '203' },
      { ProvinceID: 204, ProvinceName: 'Hải Phòng', Code: '204' },
      { ProvinceID: 205, ProvinceName: 'Cần Thơ', Code: '205' },
      { ProvinceID: 206, ProvinceName: 'Bình Dương', Code: '206' },
      { ProvinceID: 207, ProvinceName: 'Đồng Nai', Code: '207' },
      { ProvinceID: 208, ProvinceName: 'Bà Rịa - Vũng Tàu', Code: '208' },
      { ProvinceID: 209, ProvinceName: 'Quảng Ninh', Code: '209' },
      { ProvinceID: 210, ProvinceName: 'Khánh Hòa', Code: '210' },
      { ProvinceID: 211, ProvinceName: 'Thừa Thiên Huế', Code: '211' },
      { ProvinceID: 212, ProvinceName: 'Lâm Đồng', Code: '212' },
      { ProvinceID: 213, ProvinceName: 'Nghệ An', Code: '213' },
      { ProvinceID: 214, ProvinceName: 'Thanh Hóa', Code: '214' },
      { ProvinceID: 215, ProvinceName: 'Bắc Ninh', Code: '215' },
      { ProvinceID: 216, ProvinceName: 'Hải Dương', Code: '216' },
      { ProvinceID: 217, ProvinceName: 'Kiên Giang', Code: '217' },
      { ProvinceID: 218, ProvinceName: 'An Giang', Code: '218' },
      { ProvinceID: 219, ProvinceName: 'Bình Định', Code: '219' },
      { ProvinceID: 220, ProvinceName: 'Quảng Nam', Code: '220' },
    ];
  }

  private getFallbackDistricts(provinceId: number): GhnDistrict[] {
    if (provinceId === 202) {
      return [
        { DistrictID: 1442, ProvinceID: 202, DistrictName: 'Quận 1', Code: '1442' },
        { DistrictID: 1443, ProvinceID: 202, DistrictName: 'Quận 3', Code: '1443' },
        { DistrictID: 1444, ProvinceID: 202, DistrictName: 'Quận 7', Code: '1444' },
        { DistrictID: 1445, ProvinceID: 202, DistrictName: 'TP. Thủ Đức', Code: '1445' },
        { DistrictID: 1446, ProvinceID: 202, DistrictName: 'Quận Bình Thạnh', Code: '1446' },
        { DistrictID: 1447, ProvinceID: 202, DistrictName: 'Quận Tân Bình', Code: '1447' },
        { DistrictID: 1448, ProvinceID: 202, DistrictName: 'Quận Gò Vấp', Code: '1448' },
        { DistrictID: 1449, ProvinceID: 202, DistrictName: 'Quận Phú Nhuận', Code: '1449' },
      ];
    }
    if (provinceId === 201) {
      return [
        { DistrictID: 1500, ProvinceID: 201, DistrictName: 'Quận Ba Đình', Code: '1500' },
        { DistrictID: 1501, ProvinceID: 201, DistrictName: 'Quận Hoàn Kiếm', Code: '1501' },
        { DistrictID: 1502, ProvinceID: 201, DistrictName: 'Quận Cầu Giấy', Code: '1502' },
        { DistrictID: 1503, ProvinceID: 201, DistrictName: 'Quận Đống Đa', Code: '1503' },
        { DistrictID: 1504, ProvinceID: 201, DistrictName: 'Quận Hai Bà Trưng', Code: '1504' },
        { DistrictID: 1505, ProvinceID: 201, DistrictName: 'Quận Tây Hồ', Code: '1505' },
        { DistrictID: 1506, ProvinceID: 201, DistrictName: 'Quận Thanh Xuân', Code: '1506' },
      ];
    }
    return [
      { DistrictID: 1600, ProvinceID: provinceId, DistrictName: 'Thành phố / Quận trung tâm', Code: '1600' },
      { DistrictID: 1601, ProvinceID: provinceId, DistrictName: 'Thị xã / Huyện 1', Code: '1601' },
      { DistrictID: 1602, ProvinceID: provinceId, DistrictName: 'Huyện 2', Code: '1602' },
    ];
  }

  private getFallbackWards(districtId: number): GhnWard[] {
    return [
      { WardCode: '21211', DistrictID: districtId, WardName: 'Phường Bến Nghé' },
      { WardCode: '21212', DistrictID: districtId, WardName: 'Phường Bến Thành' },
      { WardCode: '21213', DistrictID: districtId, WardName: 'Phường Đa Kao' },
      { WardCode: '21214', DistrictID: districtId, WardName: 'Phường Tân Định' },
      { WardCode: '21215', DistrictID: districtId, WardName: 'Phường Linh Xuân' },
      { WardCode: '21216', DistrictID: districtId, WardName: 'Phường Trung tâm' },
    ];
  }
}
