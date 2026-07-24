import { Pipe, PipeTransform } from '@angular/core';
import { fmtFecha } from '../../domain/fecha.util';

// Fecha larga en español (p. ej. "3 de junio de 2026").
@Pipe({ name: 'fechaLarga' })
export class FechaLargaPipe implements PipeTransform {
  transform(d: Date): string {
    return fmtFecha(d);
  }
}
