import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Get the backend API URL from environment variables
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8005";
    console.log("Backend URL:", backendUrl);
    
    // Forward the request to the backend
    const response = await axios.post(`${backendUrl}/api/chat`, req.body, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 seconds timeout
    });
    
    // Return the response from the backend
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Chat API Error:", error);
    
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      if (error.code === "ECONNREFUSED") {
        return res.status(503).json({ 
          message: "Cannot connect to backend server. Please make sure the backend server is running." 
        });
      } else if (error.code === "ECONNABORTED") {
        return res.status(504).json({ 
          message: "Connection to backend server timed out." 
        });
      } else if (error.response) {
        return res.status(error.response.status).json({ 
          message: error.response.data?.message || "Backend server error" 
        });
      }
    }
    
    return res.status(500).json({ message: "Internal server error" });
  }
}