# plumber.R
library(plumber)

#* @apiTitle My Data‐Processing API

# Allow CORS from anywhere (or lock it down to your SPA’s origin)
#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$setHeader("Access-Control-Allow-Methods",
                  "GET,POST,OPTIONS")
    res$setHeader("Access-Control-Allow-Headers",
                  "Content-Type,Authorization")
    res$status <- 200
    return(list())
  }
  plumber::forward()
}

#* Process incoming data and return a result
#* @post /process
#* @json
function(req, res) {
  # req$body is already parsed JSON
  input_data <- req$body

  # ---- your R processing here ----
  # e.g. compute column means if data is a data‑frame list
  if (is.list(input_data) && length(input_data) && 
      is.numeric(input_data[[1]])) {
    result <- lapply(input_data, mean)
  } else {
    result <- list(error = "unexpected format")
  }

  # return as JSON
  res$status <- 200
  result
}
