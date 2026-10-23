interface GroupDTO {
  id: number;
  groupName: string;
  comments: string;
}
interface GroupDetails {
  id: number | string;
  groupName: string;
  comments?: string | undefined;
}

class Group {
  readonly id: number;
  readonly groupName: string;
  readonly comments: string;

  constructor({ id, groupName, comments = '' }: GroupDetails) {
    this.id = Number(id);
    this.groupName = groupName;
    this.comments = comments;
  }

  toGroupDTO(): GroupDTO {
    return { id: this.id, groupName: this.groupName, comments: this.comments };
  }

  toJSON(): GroupDTO {
    return this.toGroupDTO();
  }
}

export { Group };
export type { GroupDTO, GroupDetails };
