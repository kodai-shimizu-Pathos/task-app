import { TestBed } from '@angular/core/testing';

import { TaskData } from './task-data';

describe('TaskData', () => {
  let service: TaskData;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskData);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
