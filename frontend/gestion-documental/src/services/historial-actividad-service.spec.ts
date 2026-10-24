import { TestBed } from '@angular/core/testing';

import { HistorialActividadService } from './historial-actividad-service';

describe('HistorialActividadService', () => {
  let service: HistorialActividadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistorialActividadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
