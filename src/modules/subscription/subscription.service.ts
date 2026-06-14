import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { calculateNextDueDate } from '../../shared/utils/date.util';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(statuses?: SubscriptionStatus[]) {
    return this.prisma.subscription.findMany({
      where: statuses ? { status: { in: statuses } } : undefined,
      orderBy: { nextDueDate: 'asc' },
    });
  }

  async findByName(name: string) {
    return this.prisma.subscription.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
  }

  async findById(id: string) {
    return this.prisma.subscription.findUnique({ where: { id } });
  }

  async create(dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({ data: dto });
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    return this.prisma.subscription.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.prisma.subscription.delete({ where: { id } });
  }

  async markDone(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException(`Subscription not found: ${id}`);

    const nextDue = calculateNextDueDate(sub.nextDueDate, sub.billingType, sub.billingInterval);

    await this.prisma.paymentHistory.create({
      data: {
        subscriptionId: id,
        paidAmount: sub.cost,
        paidAt: new Date(),
      },
    });

    return this.prisma.subscription.update({
      where: { id },
      data: {
        lastPaidDate: new Date(),
        nextDueDate: nextDue,
        status: 'ACTIVE',
      },
    });
  }

  async skip(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException(`Subscription not found: ${id}`);

    const nextDue = calculateNextDueDate(sub.nextDueDate, sub.billingType, sub.billingInterval);
    return this.prisma.subscription.update({
      where: { id },
      data: { nextDueDate: nextDue },
    });
  }

  async pause(id: string) {
    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  async resume(id: string) {
    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async cancel(id: string) {
    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }

  async searchNames(query: string, statuses?: SubscriptionStatus[]) {
    return this.prisma.subscription.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' },
        ...(statuses && { status: { in: statuses } }),
      },
      take: 25,
      orderBy: { name: 'asc' },
      select: { name: true },
    });
  }

  async getPaymentHistory() {
    return this.prisma.paymentHistory.findMany({
      include: { subscription: { select: { name: true } } },
      orderBy: { paidAt: 'desc' },
    });
  }
}
