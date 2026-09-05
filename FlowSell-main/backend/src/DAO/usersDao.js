import User from "../models/User.js";

class UsersDAO{
    async findOneUser({ meliId }){
      try{
        const user = await User.findOne({ meliId }).select('+accessToken +refreshToken');
        return user;
      } catch (error) {
        throw new Error(`Error finding user by meliId=${meliId}: ${error.message}`);
      }
    }

  async findById(id) {
    try {
      return await User.findById(id).select('-refreshToken -accessToken');
    } catch (error) {
      throw new Error(`Error finding user by id=${id}: ${error.message}`);
    }
  }

  async findByIdWithTokens(id) {
    try {
      return await User.findById(id).select('+refreshToken +accessToken');
    } catch (error) {
      throw new Error(`Error finding user with tokens by id=${id}: ${error.message}`);
    }
  }

  async findOrCreate({ meliId, email, nickname, picture, accessToken, refreshToken, expiresAt }) {
    try {
      let user = await this.findOneUser({ meliId });
      if (!user) {
        user = new User({ meliId, email, nickname, picture });
      }
      user.accessToken = accessToken;
      user.refreshToken = refreshToken;
      user.expiresAt = expiresAt;
      return await user.save();
    } catch (error) {
      throw new Error(`Error in findOrCreate user meliId=${meliId}: ${error.message}`);
    }
  }
}

export const usersDAO = new UsersDAO()
