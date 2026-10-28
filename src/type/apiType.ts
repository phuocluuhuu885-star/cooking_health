export type ApiType = {
  method: 'post' | 'get' | 'put' | 'delete';
  url: string;
  timeout?: number;
  type?: 'application/json' | 'multipart/form-data';
  accept?: 'application/json';
  typeMethod?: 'post' | 'get';
  base?: 'dcapi';
};
