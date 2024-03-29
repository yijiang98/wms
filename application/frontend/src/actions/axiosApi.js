import axios from 'axios'


const axiosInstance = axios.create({
  baseURL: '/',
  timeout: 5000,
  headers: {
    'Authorization': localStorage.getItem('access_token') ? 'JWT ' + localStorage.getItem('access_token') : null,
    'Content-Type': 'application/json',
    'accept': 'application/json'
  }
})

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response.status === 401 && originalRequest.url === 'api/token/refresh/') {
      window.location.href = '/login/';
      return Promise.reject(error);
    }

    if (error.response.data.code === 'token_not_valid' &&
      error.response.status === 401 && 
      error.response.statusText === 'Unauthorized') 
    {
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken){
        const tokenParts = JSON.parse(atob(refreshToken.split('.')[1]));

        // exp date in token is expressed in seconds, while now() returns milliseconds:
        const now = Math.ceil(Date.now() / 1000);
        console.log(tokenParts.exp);

        if (tokenParts.exp > now) {
          try {
            const response = await axiosInstance
              .post('api/token/refresh/', { refresh: refreshToken });
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);

            axiosInstance.defaults.headers['Authorization'] = 'JWT ' + response.data.access;
            originalRequest.headers['Authorization'] = 'JWT ' + response.data.access;
            return await axiosInstance(originalRequest);
          } catch (err) {
            console.log(err);
          }
        } else{
          console.log('Refresh token is expired', tokenParts.exp, now);
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          axiosInstance.defaults.headers['Authorization'] = null
          window.location.href = '/'
        }
      } else{
        console.log('Refresh token not available.')
        window.location.href = '/login/';
      }
    }


    // specific error handling done elsewhere
    return Promise.reject(error);
  }
);

export default axiosInstance
