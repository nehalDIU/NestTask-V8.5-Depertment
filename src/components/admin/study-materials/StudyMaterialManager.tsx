import { StudyMaterialForm } from './StudyMaterialForm';
import { StudyMaterialList } from './StudyMaterialList';
import type { Course, StudyMaterial, NewStudyMaterial } from '../../../types/course';

interface StudyMaterialManagerProps {
  courses: Course[];
  materials: StudyMaterial[];
  onCreateMaterial: (material: NewStudyMaterial) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
  sectionId?: string;
  isSectionAdmin?: boolean;
}

export function StudyMaterialManager({
  courses,
  materials,
  onCreateMaterial,
  onDeleteMaterial,
  sectionId,
  isSectionAdmin = false
}: StudyMaterialManagerProps) {
  return (
    <div>
      <StudyMaterialForm 
        courses={courses}
        onSubmit={onCreateMaterial}
        sectionId={sectionId}
        isSectionAdmin={isSectionAdmin}
      />
      <StudyMaterialList 
        materials={materials}
        onDelete={onDeleteMaterial}
      />
    </div>
  );
}