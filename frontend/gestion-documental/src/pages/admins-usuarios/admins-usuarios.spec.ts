import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminsUsuarios } from './admins-usuarios';

describe('AdminsUsuarios', () => {
  let component: AdminsUsuarios;
  let fixture: ComponentFixture<AdminsUsuarios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminsUsuarios],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminsUsuarios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
