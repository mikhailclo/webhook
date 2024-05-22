use actix_web::{web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_multipart::Multipart;
use futures::StreamExt;
use std::fs::File;
use std::io::Write;
use std::path::Path;
use std::sync::Mutex;
use std::collections::HashMap;

#[macro_use] extern crate lazy_static;

lazy_static! {
    static ref LOGS: Mutex<HashMap<String, String>> = Mutex::new(HashMap::new());
}

/// Handles errors by logging the error message.
fn error_handler(error: &str) {
    let mut logs = LOGS.lock().unwrap();
    logs.insert("errorHandler".to_string(), error.to_string());
    println!("errorHandler: {}", error);
}

/// Processes the form data from the request.
///
/// # Arguments
///
/// * `payload` - The form data from the request.
///
/// # Returns
///
/// A promise that resolves when the processing is complete.
async fn process_form_data(mut payload: Multipart) -> Result<(), String> {
    let mut status = String::new();
    let mut id_gen = String::new();
    let mut time_gen = String::new();
    let mut img_message = String::new();
    let mut res_image = None;

    while let Some(item) = payload.next().await {
        let mut field = item.unwrap();
        let content_disposition = field.content_disposition().clone();
        let name = content_disposition.get_name().unwrap_or("").to_string();

        let mut data = Vec::new();

        while let Some(chunk) = field.next().await {
            data.extend_from_slice(&chunk.unwrap());
        }

        match name.as_str() {
            "status" => status = String::from_utf8(data).unwrap(),
            "id_gen" => id_gen = String::from_utf8(data).unwrap(),
            "time_gen" => time_gen = String::from_utf8(data).unwrap(),
            "img_message" => img_message = String::from_utf8(data).unwrap(),
            "res_image" => res_image = Some(data),
            _ => {}
        }
    }

    if status != "200" {
        return Err(img_message);
    } else if res_image.is_none() {
        return Err("resImage is not a file".to_string());
    }

    let res_image = res_image.unwrap();
    let path = Path::new("resImage.png");
    let mut file = File::create(&path).map_err(|e| e.to_string())?;
    file.write_all(&res_image).map_err(|e| e.to_string())?;

    println!("processFormData: ID: {}, Time: {}", id_gen, time_gen);
    Ok(())
}

/// Main handler function for the webhook endpoint.
///
/// # Arguments
///
/// * `req` - The incoming request.
/// * `payload` - The multipart payload.
///
/// # Returns
///
/// A promise that resolves to the response.
async fn handle_webhook(req: HttpRequest, payload: Multipart) -> Result<HttpResponse, Error> {
    if req.method() != "POST" {
        return Ok(HttpResponse::MethodNotAllowed().finish());
    }

    if !req.headers().get("content-type").map_or(false, |v| v.to_str().unwrap_or("").contains("multipart/form-data")) {
        return Ok(HttpResponse::BadRequest().finish());
    }

    match process_form_data(payload).await {
        Ok(_) => Ok(HttpResponse::Ok().body("OK")),
        Err(err) => {
            error_handler(&err);
            Ok(HttpResponse::Ok().body("OK"))
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/webhook", web::post().to(handle_webhook))
    })
    .bind("127.0.0.1:4000")?
    .run()
    .await
}
