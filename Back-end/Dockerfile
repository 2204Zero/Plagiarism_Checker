FROM python:3.10-slim

WORKDIR /app

# System dependencies for building and running
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY Back-end /app/Back-end

WORKDIR /app/Back-end

RUN pip install --no-cache-dir -r requirements.txt

# Compile C++ checker
WORKDIR /app/Back-end/cpp_checker
RUN g++ -O2 -o ../bin/cpp_checker main.cpp

WORKDIR /app/Back-end

EXPOSE 8000

CMD ["python", "main.py"]





