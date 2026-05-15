import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseDto } from '../common/dto/response.dto';

@Injectable()
export class CamerasService {
  constructor(private prisma: PrismaService) {}

  async lprEvent(dto: any, emitFn?: Function) {
    const plate = dto.plate.toUpperCase().replace(/\s/g, '');

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { placa: { contains: plate }, deleted_at: null },
      include: { user: { select: { id: true, first_name: true, last_name: true, role: true } } },
    });

    const result: any = {
      plate,
      camera_id: dto.camera_id,
      confidence: dto.confidence ?? 0.95,
      timestamp: new Date(),
      recognized: !!vehicle,
    };

    if (vehicle) {
      result.vehicle = { id: vehicle.id, placa: vehicle.placa, brand: vehicle.brand, color: vehicle.color, blacklisted: vehicle.blacklisted, is_authorized: vehicle.is_authorized };
      result.user = vehicle.user;

      if (vehicle.blacklisted && emitFn) {
        emitFn('parking:alert', { type: 'BLACKLIST_DETECTED', message: `Vehículo en lista negra detectado: ${vehicle.placa}`, severity: 'CRITICAL', timestamp: new Date() });
      }
    }

    if (emitFn) emitFn('lpr:detection', result);

    return ResponseDto.ok(result, 'Evento LPR procesado');
  }

  async list(campus_id?: string) {
    const where: any = {};
    if (campus_id) where.campus_id = campus_id;
    const cameras = await this.prisma.camera.findMany({ where, orderBy: { name: 'asc' } });
    return ResponseDto.ok(cameras);
  }

  async findOne(id: string) {
    const camera = await this.prisma.camera.findUnique({ where: { id } });
    if (!camera) throw new NotFoundException('Cámara no encontrada');
    return ResponseDto.ok(camera);
  }

  async create(dto: any) {
    const camera = await this.prisma.camera.create({ data: dto });
    return ResponseDto.created(camera, 'Cámara registrada');
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    const camera = await this.prisma.camera.update({ where: { id }, data: dto });
    return ResponseDto.ok(camera, 'Cámara actualizada');
  }

  async facialRecognition(camera_id: string, image_data: string) {
    return ResponseDto.ok({
      camera_id,
      timestamp: new Date(),
      recognized: false,
      message: 'Reconocimiento facial no disponible en esta versión',
    });
  }
}
