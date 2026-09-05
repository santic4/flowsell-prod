export class UserDTO {
    constructor(user) {
      this.meliId = user.meliId;
      this.email = user.email;
      this.nickname = user.nickname;
      this.picture = user.picture;
    }
}