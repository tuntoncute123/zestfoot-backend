import { Controller, Post, Body, Get, Delete, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { QueryTableDto } from "./dto/query-table.dto";
import { InsertIntoTableDto } from "./dto/insert-into-table.dto";
import { UpdateTableDto } from "./dto/update-table.dto";
import { DeleteFromTableDto } from "./dto/delete-from-table.dto";

export class CopilotDto {
  messages: any[];
  sessionMetadata?: any;
}

@ApiTags("admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("query")
  @ApiOperation({ summary: "Truy vấn dữ liệu bảng (Proxy Admin)" })
  @ApiResponse({ status: 200, description: "Kết quả truy vấn." })
  async queryTable(@Body() body: QueryTableDto) {
    return this.adminService.queryTable(body);
  }

  @Post("insert")
  @ApiOperation({ summary: "Nạp dữ liệu vào bảng (Proxy Admin)" })
  @ApiResponse({ status: 201, description: "Chèn dữ liệu thành công." })
  async insertIntoTable(@Body() body: InsertIntoTableDto) {
    return this.adminService.insertIntoTable(body);
  }

  @Post("update")
  @ApiOperation({ summary: "Cập nhật bản ghi bảng (Proxy Admin)" })
  @ApiResponse({ status: 200, description: "Cập nhật thành công." })
  async updateTable(@Body() body: UpdateTableDto) {
    return this.adminService.updateTable(body);
  }

  @Post("delete")
  @ApiOperation({ summary: "Xóa bản ghi bảng (Proxy Admin)" })
  @ApiResponse({ status: 200, description: "Xóa thành công." })
  async deleteFromTable(@Body() body: DeleteFromTableDto) {
    return this.adminService.deleteFromTable(body);
  }

  @Get("mining")
  @ApiOperation({
    summary: "Khai phá dữ liệu (Market Basket, RFM, Review Mining)",
  })
  @ApiResponse({ status: 200, description: "Kết quả khai phá dữ liệu." })
  async getMiningData() {
    return this.adminService.getMiningData();
  }

  @Get("analytics")
  @ApiOperation({
    summary: "Thống kê kết quả kinh doanh và Gamification ROI (DWH)",
  })
  @ApiQuery({ name: "brand", required: false, type: String })
  async getAnalytics(@Query("brand") brand?: string) {
    return this.adminService.getAnalytics(brand || "all");
  }

  @Post("auto-content")
  @ApiOperation({ summary: "Tự động tạo nội dung Blog & Social bằng AI" })
  async autoContent() {
    return this.adminService.autoContent();
  }

  @Post("copilot")
  @ApiOperation({ summary: "Trò chuyện phân tích kinh doanh cùng Copilot" })
  @ApiResponse({ status: 200, description: "Phản hồi từ Copilot." })
  async copilot(@Body() body: CopilotDto) {
    return this.adminService.copilot(body.messages, body.sessionMetadata);
  }

  @Get("ai-health")
  @ApiOperation({ summary: "Kiểm tra trạng thái Python Ollama service" })
  async getAiHealth() {
    return this.adminService.getAiHealth();
  }

  @Get("python-health")
  @ApiOperation({ summary: "Kiểm tra kết nối Python FastAPI microservice" })
  async getPythonHealth() {
    return this.adminService.getAiHealth();
  }

  @Get("ml")
  @ApiOperation({ summary: "Dự báo nhu cầu ML và gợi ý sản phẩm cá nhân hóa" })
  @ApiQuery({ name: "email", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getMlAnalytics(
    @Query("email") email?: string,
    @Query("limit") limit?: number,
  ) {
    return this.adminService.getMlAnalytics(email, limit);
  }
}
