import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET() {
  try {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const is_peak = [7, 8, 9, 12, 13, 17, 18, 19].includes(hour);

    const [total_spaces, current_occupancy] = await Promise.all([
      prisma.parkingSpace.count({ where: { is_active: true } }),
      prisma.parkingSpace.count({ where: { status: 'OCCUPIED' } }),
    ]);

    const occupancy_rate = total_spaces > 0 ? current_occupancy / total_spaces : 0;
    let predicted_next_hour = Math.round(occupancy_rate * total_spaces);
    if (is_peak && !isWeekend) predicted_next_hour = Math.min(total_spaces, Math.round(predicted_next_hour * 1.2));
    if (isWeekend) predicted_next_hour = Math.round(predicted_next_hour * 0.7);

    return res.ok({
      current_occupancy, total_spaces, occupancy_rate: parseFloat((occupancy_rate * 100).toFixed(1)),
      is_peak_hour: is_peak, is_weekend: isWeekend,
      predicted_next_hour, predicted_occupancy_rate: parseFloat(((predicted_next_hour / total_spaces) * 100).toFixed(1)),
      recommendation: occupancy_rate > 0.85 ? 'ALTA_DEMANDA' : occupancy_rate > 0.6 ? 'DEMANDA_MODERADA' : 'BAJA_DEMANDA',
    });
  } catch (e) {
    return res.error(e.message);
  }
}
