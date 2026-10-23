export interface RoleDTO {
  name: string;
}

class Role {
  readonly name: string;

  constructor({ name }: RoleDTO) {
    this.name = name;
  }

  toRoleDTO(): RoleDTO {
    return { name: this.name };
  }

  toJSON(): RoleDTO {
    return this.toRoleDTO();
  }
}

export { Role };
