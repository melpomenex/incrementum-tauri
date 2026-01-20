vm_name = File.basename(Dir.getwd)

Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-24.04"

  # Optional: Forward ports for your applications
  # config.vm.network "forwarded_port", guest: 3000, host: 3000, auto_correct: true
  # config.vm.network "forwarded_port", guest: 8000, host: 8000, auto_correct: true

  # Share current directory with the VM
  config.vm.synced_folder ".", "/agent-workspace", type: "virtualbox"

  config.vm.provider "virtualbox" do |vb|
    vb.memory = "4096"
    vb.cpus = 2
    vb.gui = false
    vb.name = vm_name
    # Reduce CPU usage when idle (fixes VirtualBox 7.2.4+ bug)
    vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
    vb.customize ["modifyvm", :id, "--audio", "none"]
    vb.customize ["modifyvm", :id, "--usb", "off"]
  end

  config.vm.provision "shell", inline: <<-SHELL
    export DEBIAN_FRONTEND=noninteractive

    # Update package list
    apt-get update

    # Install essential tools
    apt-get install -y docker.io nodejs npm git unzip curl vim

    # Install Claude Code
    npm install -g @anthropic-ai/claude-code --no-audit

    # Add vagrant user to docker group
    usermod -aG docker vagrant

    # Ensure passwordless sudo for vagrant user
    echo "vagrant ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/vagrant
    chmod 0440 /etc/sudoers.d/vagrant

    # Set up Claude Code config directory for vagrant user
    mkdir -p /home/vagrant/.claude
    chown -R vagrant:vagrant /home/vagrant

    # Fix ownership of shared folder
    chown -R vagrant:vagrant /agent-workspace

    echo "==================================="
    echo "Claude Code VM Ready!"
    echo "==================================="
    echo ""
    echo "Claude Code has:"
    echo "  - Passwordless sudo access"
    echo "  - Docker access"
    echo "  - Full system control"
    echo ""
    echo "Next steps:"
    echo "  1) Run: claude-vm setup"
    echo "  2) Run: claude-vm ssh"
    echo "  3) Run: cd /agent-workspace"
    echo "  4) Run: claude --dangerously-skip-permissions"
    echo ""
    echo "Get API keys:"
    echo "  - Anthropic: https://console.anthropic.com/"
    echo "  - Zhipu AI:  https://open.bigmodel.cn/"
    echo "==================================="
  SHELL
end
