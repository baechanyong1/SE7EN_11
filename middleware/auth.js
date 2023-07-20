const jwt = require("jsonwebtoken");
const User = require("../database/model/user.js");
const { accessExpiresIn, accessSecretKey, refreshExpiresIn, refreshSecretKey } =
  require("../config.js").jwt;

class Auth {
  constructor() {
    this.jwt = jwt;
    this.User = User;
  }

  getAccessToken(userId) {
    return (
      "Bearer " +
      this.jwt.sign({ userId }, accessSecretKey, { expiresIn: accessExpiresIn })
    );
  }

  getRefreshToken(userId) {
    return (
      "Bearer " +
      this.jwt.sign({ userId }, refreshSecretKey, {
        expiresIn: refreshExpiresIn,
      })
    );
  }
  async verify(req, res, next) {
    const accessToken = req.cookies.accessToken;
        if(accessToken){
          let token = accessToken.split(' ')[1];

          const accessPayload = jwt.verify(token,accessSecretKey,(err,decoded)=>{
              if(err){ // accessToken 이 비정상일 경우
                  return null;
              }else{ // accessToken 이 정상일 경우
                  return decoded;
              }
          });
          if (accessPayload) {
            const id = accessPayload.userId;
            const user = await User.findByPk(id);
            res.locals.user = user.dataValues;
            next();
          } else {
            // accessToken이 유효하지 않을경우
            const refreshToken = req.cookies.refreshToken;

            if (refreshToken) {
              token = refreshToken.split(" ")[1];

              const refreshPayload = jwt.verify(
                token,
                refreshSecretKey,
                (err, decoded) => {
                  if (err) {
                    return null;
                  } else {
                    return decoded;
                  }
                }
              );

              if (refreshPayload) {
                const id = refreshPayload.userId;
                const user = await User.findByPk(id);
                if (user && user.dataValues.token == refreshToken) {
                  const newAccessToken = "Bearer " +
                  this.jwt.sign({ userId:id }, accessSecretKey, { expiresIn: accessExpiresIn })
                  res.cookie("accessToken", newAccessToken, { httpOnly: true });

                  req.locals.user = user.dataValues;
                  next();
                }else{ // user 가 없거나 DB상의 토큰값이 일치하지 않을때
                  res.status(404).json({
                      errorMessage:"Token is not valid..😥"
                  });
                }
              }else{ // refreshToken 이 유효하지 않을때
                res.status(401).json({
                    errorMessage:"validate to fail..😥 Please re-login again."
                });    
              }
            }else{ // 저장된 refreshToken 이 존재하지 않을때
              res.status(404).json({
                  errorMessage:"Not Found Token. Please re-login again."
              });
            }
          }
        } else {
          // refreshToken 이 유효하지 않을때
          res.status(401).json({
            errorMessage: "validate to fail..😥 Please re-login again.",
          });
        }
      }
    }

const auth = new Auth();

module.exports = auth;
