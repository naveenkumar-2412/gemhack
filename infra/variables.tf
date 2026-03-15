variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "image_uri" {
  type = string
}

variable "gemini_api_key" {
  type      = string
  sensitive = true
  default   = ""
}
