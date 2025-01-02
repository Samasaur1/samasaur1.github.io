---
layout: post
title: 'Centralized Logging and Metrics with the Grafana stack on NixOS'
# date: 2024-02-13 18:49 -0800
tags:
- nixos
- grafana
- loki
- mimir
- prometheus
---
At this point, I’m hosting a small fleet of systems, which are collectively hosting a fair amount of services.  These services all generate logs, which is great. However, all of this data is spread across machines and is inefficient to access or analyze, so I usually just ignored it. This is especially an issue when problems occur, because I can't always access the relevant data, nor is it always sufficient.

Enter [the Grafana/LGTM stack](https://grafana.com/oss/). This is a suite of open-source applications for collecting and visualizing analytics, metrics, and logs.
