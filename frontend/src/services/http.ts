import axios from "axios";
import { resolveApiBaseUrl } from "./baseUrl";

export const http = axios.create({
  baseURL: resolveApiBaseUrl()
});
