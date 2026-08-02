import { Injectable } from '@nestjs/common';
import {
  IExerciseSeederPort,
  SeedExerciseInput,
} from '../../domain/interfaces/exercise-seeder.port';
// Cross-module bridge: đây là nơi DUY NHẤT lessons chạm model Exercise của code-execution.
// (Cân nhắc Phase sau: code-execution export 1 seeder port để bỏ hẳn import model này.)
import { Exercise } from '../../../code-execution/models/exercise.model';

const starterFor = (language: string): string => {
  const lang = (language ?? 'javascript').toLowerCase();
  if (lang === 'python') {
    return '# Write your solution below.\n# Read input via "input" (multi-line string).\nprint("Hello, ThreadLearn!")\n';
  }
  if (lang === 'java') {
    return 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, ThreadLearn!");\n  }\n}\n';
  }
  return '// Write your solution below.\n// Use the provided "input" string.\nconsole.log("Hello, ThreadLearn!");\n';
};

@Injectable()
export class MongoExerciseSeederAdapter implements IExerciseSeederPort {
  async seedStarter(input: SeedExerciseInput): Promise<void> {
    const language = (input.courseLanguage ?? 'javascript').toLowerCase();
    await Exercise.create({
      lessonId: input.lessonId,
      title: `${input.lessonTitle} — Starter exercise`,
      description:
        'Template tự tạo. Admin chỉnh sửa lại nội dung + test cases trong /admin/exercises.',
      starterCode: starterFor(language),
      language,
      testCases: [{ input: '', expectedOutput: 'Hello, ThreadLearn!', isHidden: false, points: 1 }],
      totalPoints: 1,
      timeLimitMs: 5000,
      memoryLimitKb: 131072,
      status: 'DRAFT',
    });
  }
}
