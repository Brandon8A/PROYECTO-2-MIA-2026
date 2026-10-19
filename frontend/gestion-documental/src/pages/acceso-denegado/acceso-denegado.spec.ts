import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccesoDenegado } from './acceso-denegado';

describe('AccesoDenegado', () => {
  let component: AccesoDenegado;
  let fixture: ComponentFixture<AccesoDenegado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccesoDenegado],
    }).compileComponents();

    fixture = TestBed.createComponent(AccesoDenegado);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
