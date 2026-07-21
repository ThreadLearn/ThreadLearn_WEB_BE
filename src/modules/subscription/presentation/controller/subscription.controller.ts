import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import {
  PaymentWebhookDto,
  PurchasePlanDto,
  paymentWebhookSchema,
  purchaseIdParamSchema,
  purchasePlanSchema,
} from '../../application/dto/plan.dto';
import { GetMySubscriptionService } from '../../application/services/get-my-subscription.service';
import { GetMyPurchaseService } from '../../application/services/get-my-purchase.service';
import { ProcessPaymentWebhookService } from '../../application/services/process-payment-webhook.service';
import { PurchasePlanService } from '../../application/services/purchase-plan.service';
import { PurchasePresenter } from '../response/purchase.presenter';
import { SubscriptionPresenter } from '../response/subscription.presenter';

@ApiTags('Subscription')
@Controller('v1/subscription')
export class SubscriptionController {
  constructor(
    private readonly purchasePlan: PurchasePlanService,
    private readonly getMySubscription: GetMySubscriptionService,
    private readonly getMyPurchase: GetMyPurchaseService,
    private readonly processPaymentWebhook: ProcessPaymentWebhookService,
  ) {}

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC52 — purchase subscription plan.' })
  async purchase(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(purchasePlanSchema)) body: PurchasePlanDto,
  ) {
    const purchase = await this.purchasePlan.execute(user.id, body.planId);
    return ApiResponse.success({
      message: 'Payment request created successfully.',
      data: PurchasePresenter.toResponse(purchase),
      statusCode: 201,
    });
  }

  @Get('my-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC52 — get current user subscription.' })
  async mine(@CurrentUser() user: AuthenticatedUser) {
    const subscription = await this.getMySubscription.execute(user.id);
    return ApiResponse.success({
      message: 'Subscription fetched successfully.',
      data: SubscriptionPresenter.toResponse(subscription),
    });
  }

  @Get('purchases/:purchaseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC52 — get current user purchase status.' })
  async purchaseStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('purchaseId', new ZodValidationPipe(purchaseIdParamSchema)) purchaseId: string,
  ) {
    const purchase = await this.getMyPurchase.execute(user.id, purchaseId);
    return ApiResponse.success({
      message: 'Purchase fetched successfully.',
      data: PurchasePresenter.toResponse(purchase),
    });
  }

  @Post('webhook/payment')
  @ApiOperation({ summary: 'UC52 — payment webhook.' })
  async webhook(@Body(new ZodValidationPipe(paymentWebhookSchema)) body: PaymentWebhookDto) {
    const purchase = await this.processPaymentWebhook.execute(body);
    return ApiResponse.success({
      message: 'Payment webhook processed successfully.',
      data: PurchasePresenter.toResponse(purchase),
    });
  }
}
