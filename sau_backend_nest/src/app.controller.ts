import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './modules/auth/public.decorator';
import { HealthResponseDto } from './shared/dto/api-response.dto';

@ApiTags('系统')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: '健康检查',
    description: '返回服务运行状态及当前配置信息（端口、Chrome 模式、Redis 地址等）',
  })
  @ApiResponse({ status: 200, description: '服务正常', type: HealthResponseDto })
  health() {
    return this.appService.getHealth();
  }
}
